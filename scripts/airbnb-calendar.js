/**
 * @Fileoverview Airbnb crawler
 * @Author SeasonLi | season.chopsticks@gmail.com
 * @Version 1.0 | 2016-08-15 | SeasonLi    // Initial version
 **/

////////////////////////////////////////////////////////////////////////////////////////////////////
// Require
var https = require('https');
var fs = require('fs');
var path = require('path');
var cluster = require('cluster');


////////////////////////////////////////////////////////////////////////////////////////////////////
// Init Data


////////////////////////////////////////////////////////////////////////////////////////////////////
// Get page content function
function getPageContent(options, success, error) {
  var req = https.get(options),
    res;

  // Handle request timeout
  req.setTimeout(30000, function () {
    console.log('[Error]  Request timeout ' + JSON.stringify(options));
    req.abort();
    res && res.destroy && res.destroy();
  });

  // Handle request response
  req.on('response', function (r) {
    res = r,
      statusCode = res.statusCode,
      buffers = [];

    // Continue if page exists
    if (statusCode == 200 || statusCode == 301) {
      // Handle response data
      res.on('data', function (trunk) {
        buffers.push(trunk);
      });
      // Handle response end
      res.on('end', function () {
        var buffer = Buffer.concat(buffers),
          content = buffer.toString();
        // Destroy response
        res.destroy();
        // Success callback
        success(content);
      });
    } else {
      // Destroy response
      res.destroy();
      // Error callback
      error();
    }
  });

  // Handle request error
  req.on('error', function () {
    console.log('[Error]  Request error');
    // Error callback
    error();
  });
}


//////////////////////////////////////////////////////////////////////////////////////////////////
function crawl(id, success, fail) {
  var options = {
    method: 'GET',
    protocol: 'https:',
    host: 'zh.airbnb.com',
    path: '/api/v2/calendar_months' +
      '?key=d306zoyjsyarp7ifhu67rjxn52tv0t20&currency=CNY&locale=zh' +
      '&listing_id=' + id +
      '&month=8&year=2016&count=3&_format=with_conditions',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36'
    }
  };
  console.log('\n[Log]: Try crawling: ' + options.protocol + '//' + options.host + options.path);

  getPageContent(options, function (content) {
    console.log('[Success]  Access url: ' + options.protocol + '//' + options.host + options.path);

    if (content) {
      success(content);
    } else {
      fail();
    }
  }, function () {
    fail();
  });
}


////////////////////////////////////////////////////////////////////////////////////////////////////
if (cluster.isMaster) {
  var buffers = fs.readFileSync(path.join(process.cwd(), '../files/airbnb-rooms.json'));
  var data = JSON.parse(buffers.toString());

  var idx = 0;

  for (var i = 0; i < 10; i++) {
    var worker = cluster.fork();

    worker.on('message', function (msg) {
      if (msg.cmd && (msg.cmd == 'crawl-success' || msg.cmd == 'crawl-fail')) {

        if (msg.cmd == 'crawl-success') {
          var schedule = [];
          for (var i in msg.data.content.calendar_months) {
            schedule = schedule.concat(msg.data.content.calendar_months[i].days);
          }
          data[msg.data.idx].schedule = schedule;
        }

        if (data[idx]) {
          worker.send({
            cmd: 'crawl',
            data: {
              idx: idx,
              id: data[idx].listing.id
            }
          });
          console.log('[Log]  Try crawling => ' + idx);
        } else {
          // worker.disconnect();

          var file = fs.openSync(path.join(process.cwd(), '../files/airbnb-rooms-calendar.json'), 'w');
          fs.writeSync(file, JSON.stringify(data), null, 'utf-8');
          fs.closeSync(file);

          console.log('[Log]  Finish all crawling tasks');
        }

        idx++;
      }
    });

    worker.send({
      cmd: 'crawl',
      data: {
        idx: idx,
        id: data[idx].listing.id
      }
    });
    idx++;
  }
} else {
  process.on('message', function (msg) {
    if (msg.cmd == 'crawl' && msg.data && typeof msg.data.id == 'number') {
      crawl(msg.data.id, function (content) {
        try {
          var results = JSON.parse(content);

          console.log('[Success]  Success => ' + msg.data.id);
          process.send({
            cmd: 'crawl-success',
            data: {
              idx: msg.data.idx,
              content: results
            }
          });
        } catch (e) {
          console.log('[Error]  Failed => ' + msg.data.id);
          process.send({
            cmd: 'crawl-fail'
          });
        }
      }, function () {
        console.log('[Error]  Failed => ' + msg.data.id);
        process.send({
          cmd: 'crawl-fail'
        });
      });
    }
  });
}
