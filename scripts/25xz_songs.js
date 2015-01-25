// Require
var iconv = require('iconv-lite'),
  http = require('http'),
  cheerio = require('cheerio'),
  mysql = require('mysql');

var mysqlConn = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  database: 'himalayan'
});
mysqlConn.connect();


////////////////////////////////////////////////////////////////////////////////////////////////////
// Init Data
var albumIdx = 478, // 专辑序列
  songIdx = 8, // 歌曲序列
  req_timer,
  res_timer;


////////////////////////////////////////////////////////////////////////////////////////////////////
// Get page content function
function getPageContent(url, success, error) {
  req = http.get(url, function(res) {
    var statusCode = res.statusCode,
      buffers = [];

    // Continue if page exists
    if (statusCode == 200) {
      res.on('data', function(trunk) {
        buffers.push(trunk);
      }).on('end', function() {
        var buffer = iconv.decode(Buffer.concat(buffers), 'gb2312'),
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

    // Handle response timeout
    res.setTimeout(10000);

  }).on('error', function() {
    process.stdout.write('\x07');
    console.log('[Warning]: Request error');

    // Abort request
    req.abort();

    songIdx++;
    craw();
  });

  // Handle request timeout
  // req.setTimeout(10000, function() {
  //   process.stdout.write('\x07');
  //   console.log('[Warning]: Request timeout');

  //   req.abort();
  //   songIdx++;
  //   craw();
  // });
}

// Add an item into the table
function addToTable(query, success) {
  console.log('[Log]: ' + query);
  mysqlConn.query(query, function(err, rows, fields) {
    // if (err) {
    //   throw err;
    // }
    success();
  });
};


//////////////////////////////////////////////////////////////////////////////////////////////////
function craw() {
  console.log('\n[Log]: Try crawling: ' + albumIdx + '.' + songIdx);

  var album_link = 'http://www.25xz.com/MusicList/cococmp3.cn_' + albumIdx + '.html';
  getPageContent(album_link, function(album_pageContent) {
    console.log('[Success]: access url: ' + album_link);

    var $ = cheerio.load(album_pageContent),
      $a = $('#albumSongs').find('tr').eq(songIdx).children('td').eq(2).children('a');

    if ($a[0]) {
      var player_link = 'http://www.25xz.com' + $a.attr('href');
      var song = $a.text(),
        $imlist = $('.imlist'),
        album = $imlist.children('dd').eq(0).children('a').eq(0).text(),
        artist = $imlist.children('dd').eq(1).children('a').eq(0).text(),
        source = '中国藏族音乐网';
      getPageContent(player_link, function(player_pageContent) {
        console.log('[Success]: access url: ' + player_link);

        var $ = cheerio.load(player_pageContent),
          source_link = 'http://bama.25xz.com/' + $('.Play').find('script').html().replace(/^(?:var)\sr_url\s=\s\"/, '').replace(/\?.+$/, '');
        addToTable('INSERT INTO himalayan_songs (song, artist, album, source, source_link) values ("' + song + '","' + artist + '","' + album + '","' + source + '", "' + source_link + '")', function() {
          console.log('[Success]: add an item');

          songIdx++;
          craw();
        });
      }, function() {
        songIdx++;
        craw();
      });
    } else {
      albumIdx++;
      songIdx = 1;
      craw();
    }
  }, function() {
    albumIdx++;
    songIdx = 1;
    craw();
  });
}

craw();