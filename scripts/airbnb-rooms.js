/**
 * @Fileoverview Airbnb crawller
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
function crawl(price, page, success, fail) {
  var options = {
    method: 'GET',
    protocol: 'https:',
    host: 'zh.airbnb.com',
    path: '/search/search_results?page=' + page +
      '&airbnb_plus_only=false' +
      '&price_min=' + price + '&price_max=' + (price + 5) +
      '&room_types%5B%5D=Entire+home%2Fapt' +
      '&location=Shanghai%2C+China',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36'
    }
  };
  console.log('[Log]: Try crawling: ' + options.protocol + '//' + options.host + options.path);

  getPageContent(options, function (content) {
    console.log('[Success]  Access url: ' + options.protocol + '//' + options.host + options.path);

    if (content) {
      success(content, page, success, fail);
    } else {
      fail(page, success, fail);
    }
  }, function () {
    fail(page, success, fail);
  });
}


////////////////////////////////////////////////////////////////////////////////////////////////////
var data = [];

if (cluster.isMaster) {
  var count = 0;
  var data = [];
  var range = [200, 400]

  for (var i = range[0]; i <= range[1]; i = i + 10) {
    var worker = cluster.fork();

    worker.on('message', function (msg) {
      if (msg.cmd && msg.cmd == 'crawl-success') {
        data = data.concat(msg.data.content);
      }

      if (msg.cmd && msg.cmd == 'crawl-finish') {
        count++;
        // worker.disconnect();

        if (count == (range[1] - range[0]) / 10 + 1) {
          var file = fs.openSync(path.join(process.cwd(), '../files/airbnb-rooms.json'), 'w');
          fs.writeSync(file, JSON.stringify(data), null, 'utf-8');
          fs.closeSync(file);

          console.log('[log]  Finish data.length => ' + data.length);
        }
      }
    });

    worker.send({
      cmd: 'crawl',
      data: {
        price: i
      }
    });
  }
} else {
  process.on('message', function (msg) {
    if (msg.cmd == 'crawl' && msg.data && typeof msg.data.price == 'number') {
      crawl(msg.data.price, 1, function (content, page, success, fail) {
        var results = JSON.parse(content).results_json.search_results;

        try {
          if (results.length && page + 1 < 18) {
            console.log('[Success]  price => ' + msg.data.price, ', page => ' + page);

            process.send({
              cmd: 'crawl-success',
              data: {
                content: results
              }
            });
          } else {
            console.log('[Error]  Failed price => ' + msg.data.price, ', page => ' + page);
          }
        } catch (e) {
          console.log('[Error]  Failed price => ' + msg.data.price, ', page => ' + page);
        }

        if (results.length && page + 1 < 18) {
          crawl(msg.data.price, page + 1, success, fail);
        } else {
          process.send({
            cmd: 'crawl-finish'
          });
        }
      }, function (page, success, fail) {
        console.log('[Error]  Failed price => ' + msg.data.price, ', page => ' + page);

        if (page + 1 <= 18) {
          crawl(msg.data.price, page + 1, success, fail);
        } else {
          process.send({
            cmd: 'crawl-finish'
          });
        }
      });
    }
  });
}
