var fixture = require('./fixture')
  , expected = require('./pack-fixture')
  , idxparse = require('../index')
  , Buffer = require('buffer').Buffer
  , test = require('tape')
  , fs = require('fs')

test('parses v2 packfiles', function(assert) {
  var buf = new Buffer(fixture, 'base64')
    , parser = idxparse()

  parser.on('data', ready)
  parser.end(buf)

  function ready(data) {
    assert.equal(data.objects.length, expected.objects.length) 
    assert.equal(data.cksum_idx.toString('base64'), expected.cksum_idx)
    assert.equal(data.cksum_pack.toString('base64'), expected.cksum_pack)
    assert.equal(data.im_fanout.toString('base64'), expected.im_fanout)

    var len = data.objects.length
      , i = 0

    function iter() {
      if(i === len) {
        return assert.end()
      }
      assert.equal(data.objects[i].oid.toString('base64'), expected.objects[i].oid)
      assert.equal(data.objects[i].crc.toString('base64'), expected.objects[i].crc)
      if(data.objects[i].next !== null) {
        assert.equal(data.objects.indexOf(data.objects[i].next), expected.objects[i].next)
      }

      if(typeof data.objects[i].offset === 'object') {
        // there are no large offsets in this example, unfortunately
      } else {
        assert.equal(data.objects[i].offset, expected.objects[i].offset)

      }

      ++i
      if(i % 10 === 0) {
        setTimeout(iter, 0)
      } else {
        iter()
      }
    }

    iter()
  }
})

