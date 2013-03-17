# git-packidx-parser

given a packfile, create a stream to parse it's index file.

currently only supports v2 idx files.

[![Build Status](https://travis-ci.org/chrisdickinson/git-packidx-parser.png)](https://travis-ci.org/chrisdickinson/git-packidx-parser)
[![browser support](http://ci.testling.com/chrisdickinson/git-packidx-parser.png)](http://ci.testling.com/chrisdickinson/git-packidx-parser)

```javascript

var packidx = require('git-packidx-parser')

fs.createReadStream('path/to/packidx')
  .pipe(packidx(<packfile>))
  .on('data', function(packidx) {

  })

```

## api

#### packidx() -> packidx stream

return a writable stream that emits a single `'data'` event containing a `PackIDX` instance.

#### PackIDX#find(Buffer objectID) -> {offset object} | null

attempt to find `objectID` in this index file. returns either an
offset object, or `null` if the `objectID` isn't present in this pack index.

if an offset object is returned, it'll look like so:

```javascript
{ offset: number | {hi: number, lo: number}
, next: number | {hi: number, lo: number} | null }
```

## license

MIT
