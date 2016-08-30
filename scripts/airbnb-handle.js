var fs = require('fs');
var path = require('path');

var filePath = path.join(process.cwd(), '../files/airbnb-rooms.json');
var buffers = fs.readFileSync(filePath);

var data = JSON.parse(buffers.toString());

var map = {};
var list = [];

for (var i in data) {
  delete data[i].listing.airbnb_plus_enabled;
  delete data[i].listing.extra_host_languages;
  delete data[i].listing.picture_count;
  delete data[i].listing.picture_url;
  delete data[i].listing.picture_urls;
  delete data[i].listing.user;
  delete data[i].listing.primary_host;

  delete data[i].pricing_quote.can_instant_book;
  delete data[i].pricing_quote.check_in;
  delete data[i].pricing_quote.check_out;

  delete data[i].viewed_at;

  if (!map[data[i].listing.id]) {
    map[data[i].listing.id] = true;
    list.push(data[i]);
  }
}
data = list;

var filePath = path.join(process.cwd(), '../files/airbnb-rooms-handled.json');
var file = fs.openSync(filePath, 'w');
fs.writeSync(file, JSON.stringify(data), null, 'utf-8');
fs.closeSync(file);
