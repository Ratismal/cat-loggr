const assert = require('assert');
const CatLoggr = require('../dist/index.js');

describe('CatLoggr', function () {
    describe('should instantiate', function () {
        it('with no params', function () {
            let loggr = new CatLoggr();
        });
        it('with a shard id', function () {
            let loggr = new CatLoggr({ shardId: 1 });
            assert.equal(loggr._shard, 1);
        });
        it('with a default level', function () {
            let loggr = new CatLoggr({ level: 'info' });
            assert.equal(loggr._levelName, 'info');
        });
        it('with default level definitions', function () {
            let loggr = new CatLoggr({
                levels: [
                    { name: 'catnip', color: CatLoggr._chalk.red.bgBlack },
                    { name: 'fish', color: CatLoggr._chalk.black.bgRed }
                ]
            });
            assert.equal(Object.values(loggr._levels).length, 2);
            assert.equal(loggr._levelName, 'fish');
        });
        it('with a default meta definition', function () {
            let loggr = new CatLoggr({
                meta: {
                    depth: 5, color: false, trace: true
                }
            });
            assert.equal(loggr._defaultMeta.depth, 5);
            assert.equal(loggr._defaultMeta.color, false);
            assert.equal(loggr._defaultMeta.trace, true);
        });
    });

    let loggr = new CatLoggr();

    describe('#setLevel', function () {
        it('should throw an error if the level doesn\'t exist', function () {
            assert.throws(function () {
                loggr.setLevel('catnip');
            }, Error);
        });
        it('should throw a TypeError if a string is not passed', function () {
            assert.throws(function () {
                loggr.setLevel(42);
            }, TypeError);
        });
    });

    describe('#setLevels', function () {
        it('should throw a TypeError it wasn\'t provided an array', function () {
            assert.throws(function () {
                loggr.setLevels('catnip');
            }, TypeError);
        });
    });

    it('should chain properly', function () {
        let a = new CatLoggr();
        let b = a
            .setDefaultMeta({ depth: 2 })
            .setLevels([
                { name: 'catnip', color: CatLoggr._chalk.red.bgBlack },
                { name: 'fish', color: CatLoggr._chalk.black.bgRed }
            ])
            .setLevel('catnip');
        assert.equal(a, b);
    });

    it('should execute pre-hooks', function() {
        let a = new CatLoggr();
        let b;
        a.addPreHook(params => b = params.args);

        a.log('a', 'b', 'c')
        assert.deepStrictEqual(b, ['a', 'b', 'c']);
    });

    it('should execute arg-hooks', function() {
        let a = new CatLoggr();
        let b = [];
        a.addArgHook(params => b.push(params.arg));

        a.log('a', 'b', 'c');
        assert.deepStrictEqual(b, ['a', 'b', 'c']);
    });

    it('should execute post-hooks', function() {
        let a = new CatLoggr();
        let b;
        a.addPostHook(params => b = params.text);

        a.log('a', 'b', 'c');
        assert.strictEqual(b, '\u001b[35ma\u001b[39m \u001b[35mb\u001b[39m \u001b[35mc\u001b[39m');
    });

    it('should be cute', function () {
        return true;
    });
});