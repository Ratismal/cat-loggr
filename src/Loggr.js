const chalk = require('chalk');
const moment = require('moment');
const util = require('util');

/**
 * Class containing logging functionality
 */
module.exports = class CatLoggr {
    /**
     * Creates an instance of the logger.
     * @param {Object} [options] Configuration options
     * @param {string|number} [options.shardId] The shard ID that the logger is on
     * @param {string|number} [options.shardLength=4] The maximum number of characters that a shard can be
     * @param {string} [options.level=info] The default log threshold
     * @param {level[]} [options.levels] Custom level definitions
     * @param {metaObject} [options.meta] The default meta configuration
     * @param {WriteStream} [options.stdout] The output stream to use for general logs
     * @param {WriteStream} [options.stderr] The output stream to use for error logs
     */
    constructor({ shardId, shardLength = 4, level, levels, meta, stdout, stderr } = {}) {
        if (shardId) {
            this._shard = shardId;
            this._shardLength = shardLength;
            if (typeof this._shard === 'number' && this._shard < 10) this._shard = '0' + this._shard;
        }

        this._stdout = stdout || process.stdout;
        this._stderr = stderr || process.stderr;

        this.setLevels(levels || [
            { name: 'fatal', color: chalk.red.bgBlack, err: true },
            { name: 'error', color: chalk.black.bgRed, err: true },
            { name: 'warn', color: chalk.black.bgYellow, err: true },
            { name: 'trace', color: chalk.green.bgBlack, trace: true },
            { name: 'init', color: chalk.black.bgBlue },
            { name: 'info', color: chalk.black.bgGreen },
            { name: 'verbose', color: chalk.black.bgCyan },
            { name: 'debug', color: chalk.magenta.bgBlack, aliases: ['log', 'dir'] }
        ]);


        this.setLevel(level || this.__levels[this.__levels.length - 1].name);

        this.setDefaultMeta(meta || {});

        this._meta = {};

        this._hooks = {
            arg: [],
            post: []
        };
    }

    /**
     * A helper reference to the chalk library
     */
    static get _chalk() {
        return chalk;
    }

    /**
     * An argument hook callback function
     * 
     * @callback argHookCallback
     * @param {Object} params The params that are sent by the hook
     * @param {*} [params.arg] The provided argument
     * @param {Date} params.date The timestamp of execution
     * @returns {string|null} The processed argument result, or `null` to continue executing
     */

    /**
     * Adds na arg-hook
     * @param {preHookCallback} func The hook callback 
     * @returns {CatLoggr} Self for chaining
     */
    addArgHook(func) {
        this._hooks.arg.push(func);

        return this;
    }

    /**
     * A post hook callback function
     * 
     * @callback postHookCallback
     * @param {Object} params The params that are sent by the hook
     * @param {string} params.level The level of the log
     * @param {boolean} params.error A flag signifying that the log is an error
     * @param {string} params.text The final formatted text
     * @param {Date} params.date The timestamp of execution
     * @param {string} params.timestamp The formatted timestamp
     * @param {string} [params.shard] The shard ID
     * @returns {string|null} The processed result, or `null` to continue executing
     */

    /**
     * 
     * @param {postHookCallback} func
     * @returns {CatLoggr} Self for chaining
     */
    addPostHook(func) {
        this._hooks.post.push(func);

        return this;
    }

    /**
     * @typedef {Object} metaObject
     * @property {number} [metaObject.depth=1] The depth of objects to inspect
     * @property {boolean} [metaObject.color=true] Whether to display colors
     * @property {boolean} [metaObject.trace=false] Whether to generate a stacktrace
     */

    /**
     * Sets the default meta object to use for all logs.
     * @param {metaObject?} meta The default meta object to use
     * @returns {CatLoggr?} Self for chaining
     */
    setDefaultMeta(meta) {
        if (typeof meta !== 'object')
            throw new TypeError('meta must be an object');

        let temp = { depth: 1, color: true, trace: false };
        Object.assign(temp, meta);

        this._defaultMeta = temp;

        return this;
    }

    /**
     * Sets the level threshold. Only logs on and above the threshold will be output.
     * @param {string} level The level threshold 
     * @returns {CatLoggr} Self for chaining
     */
    setLevel(level) {
        if (typeof level !== 'string')
            throw new TypeError('level must be a string');

        if (!this._levels[level])
            throw new Error(`the level '${level}' does not exist`);

        this.__level = level;
        return this;
    }

    /**
     * @typedef level
     * @property {string} level.name The name of the level
     * @property {Object} level.color The color of the level (using chalk)
     * @property {string[]} level.aliases The alternate names that can be used to invoke the level
     * @property {boolean} level.err A flag signifying that the level writes to stderr
     * @property {boolean} level.trace A flag signifying that the level should generate a stacktrace
     */

    /**
     * Overwrites the currently set levels with a custom set.
     * @param {level[]} levels An array of levels, in order from high priority to low priority
     * @returns {CatLoggr} Self for chaining
     */
    setLevels(levels) {
        if (!Array.isArray(levels))
            throw new TypeError('levels must be an array.');

        this._levels = {};
        let max = 0;
        this.__levels = levels;
        this.__levels = this.__levels.map(l => {
            l.position = this.__levels.indexOf(l);
            this._levels[l.name] = l;
            let func = function (...args) {
                return this._format(l, ...args);
            }.bind(this);
            this[l.name] = func;
            if (l.aliases && Array.isArray(l.aliases))
                for (const alias of l.aliases) this[alias] = func;
            max = l.name.length > max ? l.name.length : max;
            return l;
        });

        if (!this._levels[this.__level])
            this.__level = this.__levels[this.__levels.length - 1].name;

        this._maxLength = max + 2;

        return this;
    }

    /**
     * Registers CatLoggr as the global `console` property.
     * @returns {CatLoggr} Self for chaining
     */
    setGlobal() {
        Object.defineProperty.bind(this)(global, 'console', {
            get: () => {
                return this;
            }
        });
        return this;
    }

    get _level() {
        return this._levels[this.__level];
    }

    get _timestamp() {
        let ts = moment();
        let formatted = ts.format('MM/DD HH:mm:ss');
        return {
            raw: ts.toDate(),
            formatted: chalk.black.bgWhite(` ${formatted} `),
            formattedRaw: formatted
        };
    }

    /**
     * Center aligns text.
     * @param {string} text The text to align 
     * @param {number} length The length that it should be padded to
     * @returns {string} The padded text 
     */
    _centrePad(text, length) {
        if (text.length < length)
            return ' '.repeat(Math.floor((length - text.length) / 2))
                + text + ' '.repeat(Math.ceil((length - text.length) / 2));
        else return text;
    }

    /**
     * Writes the log to the proper stream.
     * @param {Level} level The level of the log
     * @param {string} text The text to write
     * @param {boolean} err A flag signifying whether to write to stderr
     * @param {Object} [timestamp] An optional timestamp to use
     * @param {string} timestamp.formatted The formatted timestamp
     * @param {Date} timestamp.raw The raw timestamp
     * @returns {CatLoggr} Self for chaining
     */
    _write(level, text, err = false, timestamp) {
        if (!timestamp) timestamp = this._timestamp;
        let levelStr = level.color(this._centrePad(level.name, this._maxLength));
        let stream = err ? this._stderr : this._stdout;
        let shardText = '';
        if (this._shard)
            shardText = chalk.black.bold.bgYellow(this._centrePad(this._shard.toString(), this._shardLength, false));

        for (const hook of this._hooks.post) {
            if (typeof hook == 'function') {
                let res = hook({
                    text,
                    date: timestamp.raw,
                    timestamp: timestamp.formattedRaw,
                    shard: this._shard ? this._shard.toString() : undefined,
                    level: level.name,
                    error: level.err
                });
                if (res === undefined || res === null) continue;
                else {
                    text = res.toString();
                }
                break;
            }
        }

        stream.write(`${shardText}${timestamp.formatted}${levelStr} ${text}\n`);
        return this;
    }

    /**
     * Sets the meta for the next log.
     * @param {metaObject} meta - The meta object to set
     * @returns {CatLoggr} Self for chaining
     */
    meta(meta = {}) {
        let temp = this._defaultMeta;
        Object.assign(temp, meta);
        this._meta = temp;
        return this;
    }

    /**
     * Formats logs in preparation for writing.
     * @param {*} level The level of the log
     * @param {*} args The args that were directly passed to the function
     * @returns {CatLoggr} Self for chaining
     */
    _format(level, ...args) {
        let timestamp = this._timestamp;
        if (level.position > this._level.position) return;
        let output = '';
        let text = [];
        for (const arg of args) {
            let finished = false;
            for (const hook of this._hooks.arg) {
                if (typeof hook == 'function') {
                    let res = hook({ arg, date: timestamp.raw });
                    if (res === undefined || res === null) continue;
                    else if (Array.isArray(res)) {
                        text.push(...res);
                    } else {
                        text.push(res);
                    }
                    finished = true;
                    break;
                }
            }
            if (finished) continue;

            if (typeof arg === 'string') {
                text.push(chalk.magenta(this._meta.quote ? `'${arg}'` : arg));
            } else if (typeof arg === 'number') {
                text.push(chalk.cyan(arg));
            } else if (typeof arg === 'object') {
                text.push('\n');

                if (arg instanceof Error) {
                    text.push(chalk.red(arg.stack));
                } else {
                    text.push(util.inspect(arg, this._meta));
                }
            } else text.push(arg);
        }

        output += text.join(' ');
        if (level.trace || this._meta.trace) {
            output += '\n' + new Error().stack.split('\n').slice(1).join('\n');
        }
        if (level.err) output = chalk.red(output);
        return this._write(level, output, level.err).meta();
    }
};