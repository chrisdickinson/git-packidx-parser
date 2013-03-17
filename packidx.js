module.exports = PackIDX

function PackIDX(fanout, objects, cksum_idx, cksum_pack) {
  this.im_fanout = fanout
  this.objects = objects
  this.cksum_idx = cksum_idx
  this.cksum_pack = cksum_pack
}

var cons = PackIDX
  , proto = cons.prototype

proto.read = function(oid, pack, ready) {
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
    cmp = compare_buffers(oid, this.objects[middle].oid)
    if(cmp < 0) {
      hi = middle
    } else if(cmp > 0) {
      lo = middle + 1
    } else {
      return pack._read_object_at(
          this.objects[middle]
        , this.objects[middle].next
        , ready
      )
    }
  } while(lo < hi)

  // it's not really an error to not
  // find the oid here.
  return ready(null, undefined)
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
