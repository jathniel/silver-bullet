var SilverBulletBeaconSender = require('../src/silver_bullet_beacon_sender');
var Promise = require('es6-promise').Promise;

describe('SilverBulletBeaconSender', function() {
  var silverBulletBeaconSender, silverBulletMessagePoster, silverBulletReadinessChecker;
  var readinessPromise, readinessResolve, test, sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.useFakeTimers();
    readinessPromise = new Promise(function(resolve) {
      readinessResolve = resolve;
    });
    silverBulletReadinessChecker = {whenReady: sandbox.stub().returns(readinessPromise)};
    silverBulletMessagePoster = {sendBeacon: sinon.spy()};
    silverBulletBeaconSender = new SilverBulletBeaconSender(silverBulletMessagePoster, silverBulletReadinessChecker, setTimeout);
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('sends a beacon', function() {
    silverBulletBeaconSender.start();
    expect(silverBulletMessagePoster.sendBeacon.withArgs().called).to.equal(true);
  });

  it('sends a beacon every 100ms', function() {
    expect(silverBulletMessagePoster.sendBeacon.withArgs().callCount).to.equal(0);
    silverBulletBeaconSender.start();
    expect(silverBulletMessagePoster.sendBeacon.withArgs().callCount).to.equal(1);
    sandbox.clock.tick(100);
    expect(silverBulletMessagePoster.sendBeacon.withArgs().callCount).to.equal(2);
    sandbox.clock.tick(100);
    expect(silverBulletMessagePoster.sendBeacon.withArgs().callCount).to.equal(3);
    sandbox.clock.tick(100);
    expect(silverBulletMessagePoster.sendBeacon.withArgs().callCount).to.equal(4);
  });

  it('stops sending when silverBullet is ready', function(done) {
    expect(silverBulletMessagePoster.sendBeacon.withArgs().callCount).to.equal(0);
    silverBulletBeaconSender.start();
    expect(silverBulletMessagePoster.sendBeacon.withArgs().callCount).to.equal(1);
    sandbox.clock.tick(100);
    expect(silverBulletMessagePoster.sendBeacon.withArgs().callCount).to.equal(2);
    sandbox.clock.tick(100);
    expect(silverBulletMessagePoster.sendBeacon.withArgs().callCount).to.equal(3);
    readinessPromise.then(function() {
      sandbox.clock.tick(1000);
      done();
    });
    readinessResolve();
    sandbox.clock.tick(1); // We have to do this in phantom or the promise never gets resolved
  });
});
