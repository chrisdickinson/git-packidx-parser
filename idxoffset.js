module.exports = IDXOffset

function IDXOffset(offset, oid, crc) {
  this.offset = offset
  this.oid = oid
  this.crc = crc
  this.next = null
}
