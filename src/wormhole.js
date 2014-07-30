var Promise = require('es6-promise').Promise;
var eventListener = require('eventlistener');
var jsonParser = require('./json_parser.js');
var _ = require('lodash');
var WormholeMessageSender = require('./wormhole_message_sender');
var wormholeMessageParser = require('./wormhole_message_parser');
var uuidGenerator = require('./uuid_generator');
var liteUrl = require('lite-url');

var WormholeMessageReceiver = function(wormholeWindow, wormholeOrigin, pendingMessages, subscribeCallbacks, publishResolves, wormholeMessageSender) {
  var handleMessage = function(event) {
    var sendPendingMessages = function() {
      _.each(pendingMessages, function(message) {
        wormholeMessageSender.publish(message.topic, message.data, message.uuid);
      });
    };

    if (event.origin === wormholeOrigin) {
      var eventData = jsonParser.parse(event.data);
      if (eventData) {
        var wormholeMessage = wormholeMessageParser.parse(eventData);
        console.log('Received :');
        console.log(wormholeMessage);
        if (wormholeMessage.type === 'publish') {
          console.log(subscribeCallbacks[wormholeMessage.topic]);
          _.each(subscribeCallbacks[wormholeMessage.topic], function(callback) {
            var respond = function(data) {
              wormholeMessageSender.respond(wormholeMessage.topic, data, wormholeMessage.uuid);
            }
            var responseData = callback(wormholeMessage.data, respond);
          });
          wormholeReady = true;
          sendPendingMessages();
        } else if (wormholeMessage.type === 'response') {
          publishResolves[wormholeMessage.uuid](wormholeMessage.data);
        } else if (wormholeMessage.type === 'beacon') {
          wormholeMessageSender.sendReady();
        } else if (wormholeMessage.type === 'ready') {
          wormholeReady = true;
          sendPendingMessages();
        }
      }
    }
  };

  this.startListening = function() {
    eventListener.add(window, 'message', handleMessage);
  };

  this.stopListening = function() {
    eventListener.remove(window, 'message', handleMessage);
  };
}

var Wormhole = function(wormholeWindow, url) {
  var wormholeOrigin = liteUrl(url).origin;
  var subscribeCallbacks = {};
  var publishResolves = {};
  var wormholeReady = false;
  var self = this;
  pendingMessages = [];
  var wormholeMessageSender = new WormholeMessageSender(wormholeWindow, wormholeOrigin);
  var wormholeMessageReceiver = new WormholeMessageReceiver(wormholeWindow, wormholeOrigin, pendingMessages, subscribeCallbacks, publishResolves, wormholeMessageSender);
  wormholeMessageReceiver.startListening();

  var sendBeaconsUntilReady = function() {
    if (!wormholeReady) {
      wormholeMessageSender.sendBeacon();
      setTimeout(sendBeaconsUntilReady, 1000);
    }
  };

  setTimeout(sendBeaconsUntilReady, 100);

  this.subscribe = function(topic, callback) {
    subscribeCallbacks[topic] = subscribeCallbacks[topic] || [];
    subscribeCallbacks[topic].push(callback);
  };

  this.publish = function(topic, data) {
    // outgoingMessageQueue.push(topic, data);
    var uuid = uuidGenerator.generate();
    if (wormholeReady) {
      wormholeMessageSender.publish(topic, data, uuid);
    } else {
      pendingMessages.push({topic: topic, data: data, uuid: uuid});
    }
    return new Promise(function(resolve, reject) {
      publishResolves[uuid] = resolve;
    });
  };

  this.destroy = function() {
    wormholeMessageReceiver.stopListening();
  };
};

module.exports = Wormhole;
