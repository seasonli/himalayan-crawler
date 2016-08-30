/**
 * @Fileoverview Airbnb crawler
 * @Author SeasonLi | season.chopsticks@gmail.com
 * @Version 1.0 | 2016-08-15 | SeasonLi    // Initial version
 **/

////////////////////////////////////////////////////////////////////////////////////////////////////
// Require
var fs = require('fs');
var path = require('path');


////////////////////////////////////////////////////////////////////////////////////////////////////
var buffers = fs.readFileSync(path.join(process.cwd(), '../files/airbnb-rooms-calendar.json'));
var data = JSON.parse(buffers.toString());

var num = 0;
var bookedNum = 0;
var range = [20160819, 20160905];

for (var i in data) {
  if (data[i].schedule) {
    num++;
    for (var j in data[i].schedule) {
      var date = data[i].schedule[j].date.replace(/-/g, '');
      if (date >= range[0] && date <= range[1] && !data[i].schedule[j].available) {
        bookedNum++;
      }
    }
  }
}

var divide = new Date((range[1] + '').replace(/(\d\d\d\d)(\d\d)(\d\d)/, '$1-$2-$3')).getTime() - new Date((range[0] + '').replace(/(\d\d\d\d)(\d\d)(\d\d)/, '$1-$2-$3')).getTime();

console.log(bookedNum / data.length / (divide / 86400000 + 1));
