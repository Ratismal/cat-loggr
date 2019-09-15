# Cat Loggr

[![npm](https://img.shields.io/npm/v/cat-loggr.svg)](https://www.npmjs.com/package/cat-loggr)

A simple, lightweight utility for making beautiful logs.

## Goals

1. Be lightweight
2. Be a drop-in replacement for `console.log`
3. Generate pretty, colourful logs
4. Support sharded projects (via a shard ID)
5. Support parsing of multiple arguments, including the inspecting of objects
6. Support defining display options at execution

## Screenshots

![blargbot logs](https://cat.needs-to-s.top/87a975.png)

## Installation

```
npm i --save cat-loggr
```

## Basic Usage

```js
// JavaScript:
const CatLoggr = require('cat-loggr');
// TypeScript:
import CatLoggr from 'cat-loggr/ts';

const loggr = new CatLoggr();

loggr.log('Hello, world!');
```

That's it!

## Default Log Levels
- fatal
- error
- warn
- trace
- init
- info
- verbose
- debug (aliases: log, dir)

If defined, the `info` level is default. If not, the lowest priority level is default.

## More Advanced Usage

### Custom levels

```js
const loggr = new CatLoggr({
    levels: [
        { name: 'catnip', color: CatLoggr._chalk.red.bgBlack },
        { name: 'fish', color: CatLoggr._chalk.black.bgRed }
    ]
});
// OR
const loggr = new CatLoggr()
    .setLevels([
        { name: 'catnip', color: CatLoggr._chalk.red.bgBlack },
        { name: 'fish', color: CatLoggr._chalk.black.bgRed }
    ]);

loggr.fish('Delicious!');
```

### Level threshold

```js
const loggr = new CatLoggr({
    level: 'warn'
});
// OR
const loggr = new CatLoggr()
    .setLevel('warn');

loggr.info('This will not display,');
loggr.warn('but this will!');
```

### Meta

- depth - how far into an object to inspect
- color - whether to render colors
- trace - whether to generate a stacktrace

```js
const loggr = new CatLoggr();

let obj = {
    with: {
        depth: {
            fun: '!'
        }
    }
};

loggr.log(obj);
// { with: { depth: [Object] } }
loggr.meta({depth: 2}).log(obj);
// { with: { depth: { fun: '!' } } }
```

### Hooks

You can define hook for extra argument processing.

If the hook callback returns `null` or `undefined`, the processing for that argument will continue. Otherwise, it will cease if an actual value is returned.

Returned values will be added to the log's output. If an array is returned, each element of the array will be added individually.  

```js
class Cat {}
const cat = new Cat();

const loggr = new CatLoggr()
    .addArgHook(function({ arg, date }) {
        if (arg instanceof Cat)
            return 'kitty!';
    });

loggr.log(cat);
// kitty!
```

You can also define hooks for post processing.
```js
const loggr = new CatLoggr()
    .addPostHook(function({ text }) {
        return 'Hello, ' + text; 
    });

loggr.log('world!');
// Hello, world!
```

### Global

If you want to go full meme, you can make CatLoggr overwrite the global `console` object! Use responsibly.

```js
const loggr = new CatLoggr()
    .setGlobal();

console.log('Hello, world!');
```
