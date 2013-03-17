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

#### PackIDX#read(Buffer objectID, Packfile fromPack, ready callback)

Read an `oid` from the pack file.

## license

MIT
