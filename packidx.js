module.exports = PackIDX

function PackIDX(fanout, objects, cksum_idx, cksum_pack) {
  this.im_fanout = fanout
  this.objects = objects
  this.cksum_idx = cksum_idx
  this.cksum_pack = cksum_pack
}

var cons = PackIDX
  , proto = cons.prototype

proto.find = function(oid) {
  var middle
    , first
    , cmp
    , lo
    , hi

  first = oid.readUInt8(0)
  lo = first ? this.im_fanout.readUInt32BE((first - 1) * 4) : 0
  hi = this.im_fanout.readUInt32BE(first * 4)

  do { 
    middle = (lo + hi) >>> 1

    if(!this.objects[middle]) {
      return null
    }

    cmp = compare_buffers(oid, this.objects[middle].oid)
    if(cmp < 0) {
      hi = middle
    } else if(cmp > 0) {
      lo = middle + 1
    } else {
      return {
        offset: this.objects[middle].offset
      , next: this.objects[middle].next ? this.objects[middle].next.offset : null
      }
    }
  } while(lo < hi)

  return null
}

function compare_buffers(lhs, rhs) {
  var len = Math.min(lhs.length, rhs.length)
    , li
    , ri

  for(var i = 0; i < len; ++i) {
    li = lhs.readUInt8(i)
    ri = rhs.readUInt8(i)

    if(li < ri) return -1
    if(li > ri) return 1
  }
  return 0
}
