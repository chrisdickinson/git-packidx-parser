module.exports = parse

var through = require('through')
  , Buffer = require('buffer').Buffer
  , IDXOffset = require('./idxoffset')
  , PackIDX = require('./packidx')

var _ = 0
  , STATE_VERSION = _++         // 8 bytes
  , STATE_FANOUT = _++          // 256 * 4 bytes
  , STATE_OBJECTS = _++         // objectcount * 20 + objectcount * 4 + objectcount * 4
  , STATE_LARGE_OFFSET = _++    // 8 * N 
  , STATE_TRAILER = _++         // 40 bytes

var PACK_TOC = 0xff744f63
  , VERSION_BUF = new Buffer(8)

function parse() {
  var stream = through(write, end)
    , state = STATE_VERSION
    , expecting = [0, 0, 0, 0, 0]
    , packidx = null
    , version = 1
    , accum = []
    , got = 0

  var fanout = null
    , object_count = 0
    , objects_buffer = null
    , large_offsets_buffer = null
    , large_offsets_count = 0
    , trailer_buffer = null
    , shas
    , crcs
    , offs

  expecting[STATE_VERSION] = 8
  expecting[STATE_FANOUT] = 1024
  expecting[STATE_TRAILER] = 40
  
  return stream

  function write(buf) {
    accum[accum.length] = buf
    got += buf.length

    if(state === STATE_VERSION) {
      do_version()
    }

    if(state === STATE_FANOUT) {
      do_fanout()
    }

    if(accum.length && state === STATE_OBJECTS) {
      do_objects()
    }

    if(accum.length && state === STATE_LARGE_OFFSET) {
      do_large_offset()
    }

    if(accum.length && state === STATE_TRAILER) {
      do_trailer()
    }
  }

  function end() {
    if(!packidx) { 
      return stream.emit('error', new Error('unexpected eof'))
    }
    stream.queue(packidx)
    stream.queue(null)
  }

  function do_version() {
    if(got < expecting[state]) {
      return
    }

    _fill(VERSION_BUF)

    if(VERSION_BUF.readUInt32BE(0) === PACK_TOC) {
      version = VERSION_BUF.readUInt32BE(4)
    }
    state = STATE_FANOUT
  }

  function do_fanout() {
    if(got < expecting[state]) {
      return
    }

    _fill(fanout = new Buffer(1024))

    var count = object_count = fanout.readUInt32BE(0xff << 2)

    expecting[STATE_OBJECTS] = count * 20 + count * 4 + count * 4
    state = STATE_OBJECTS
  }

  function do_objects() {
    if(got < expecting[state]) {
      return
    }

    _fill(objects_buffer = new Buffer(expecting[state]))
    
    shas = objects_buffer.slice(0, 20 * object_count)
    crcs = objects_buffer.slice(20 * object_count, 20 * object_count + 4 * object_count)
    offs = objects_buffer.slice(20 * object_count + 4 * object_count)

    for(var i = 0; i < object_count; ++i) {
      if(offs.readUInt8(i << 2) & 0x80) {
        ++large_offsets_count
      }
    }

    expecting[STATE_LARGE_OFFSET] = large_offsets_count * 8

    if(large_offsets_count) {
      state = STATE_LARGE_OFFSET
    } else {
      state = STATE_TRAILER
    }
  }

  function do_large_offset() {
    if(got < expecting[state]) {
      return
    }

    _fill(large_offsets_buffer = new Buffer(expecting[state]))
  
    state = STATE_TRAILER
  }

  function do_trailer() {
    if(got < expecting[state]) {
      return
    }

    _fill(trailer_buffer = new Buffer(expecting[state]))

    var pack_cksum = trailer_buffer.slice(0, 20)
      , idx_cksum = trailer_buffer.slice(20)
      , objects = [] 
      , seen_large_offsets = 0
      , offset

    for(var i = 0; i < object_count; ++i) {
      if(offs.readUInt8(i << 2) & 0x80) {
        offset = {
            hi: large_offsets_buffer.readUInt32BE(seen_large_offsets << 3)
          , lo: large_offsets_buffer.readUInt32BE((seen_large_offsets << 3) + 4)
        }
        ++seen_large_offsets
      } else {
        offset = offs.readUInt32BE(i << 2)
      }

      objects[objects.length] = new IDXOffset(
        offset, shas.slice(i * 20, i * 20 + 20), crcs.slice(i * 4, i * 4 + 4)
      ) 
    }

    // NB: this is probably wrong, thanks to
    // int64s ):
    var sorted = objects.slice().sort(function(lhs, rhs) {
      var lhs_is_bigint = lhs.offset.hi !== undefined
        , rhs_is_bigint = rhs.offset.hi !== undefined

      if(lhs_is_bigint && !rhs_is_bigint) {
        return 1
      } else if(!lhs_is_bigint && rhs_is_bigint) {
        return -1
      } else if(lhs_is_bigint && rhs_is_bigint) {
        if(lhs.offset.hi < rhs.offset.hi) {
          return -1
        } else if(lhs.offset.hi > rhs.offset.hi) {
          return 1
        } else {
          return lhs.offset.lo - rhs.offset.lo          
        }
      }
      return lhs.offset - rhs.offset
    })

    for(var i = 0, len = sorted.length; i < len; ++i) {
      sorted[i].next = sorted[i + 1] || null
    }

    packidx = new PackIDX(
      fanout, objects, idx_cksum, pack_cksum
    )
  }

  function _fill(current) {
    var num = current.length
      , offset = 0
      , rest

    for(var i = 0, len = accum.length; i < len; ++i) {
      rest = Math.min(num - offset, accum[i].length)
      accum[i].copy(current, offset, 0, rest)
      offset += rest
    }

    if(rest !== accum[i - 1].length) {
      accum[0] = accum[i - 1].slice(rest)
      got = accum[0].length
      accum.length = 1 
    } else {
      accum.length = 0
    }
  } 
}

