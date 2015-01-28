/**
 * @Fileoverview 25xz_songs crawler
 * @Author LiJijun | season.chopsticks@gmail.com
 * @Version 1.0 | 2015-01-25 | LiJijun    // Initial version
 **/

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
var albumIdx = 2045, // 专辑序列
  songIdx = 1; // 歌曲序列


////////////////////////////////////////////////////////////////////////////////////////////////////
// Get page content function
function getPageContent(url, success, error) {
  var req = http.get(url),
    res;

  // Handle request timeout
  req.setTimeout(30000, function() {
    process.stdout.write('\x07');
    console.log('[Warning]  Request timeout ' + JSON.stringify({
      url: url
    }));
    req.abort();
    res && res.destroy && res.destroy();
  });

  // Handle request response
  req.on('response', function(r) {
    res = r,
      statusCode = res.statusCode,
      buffers = [];

    // Continue if page exists
    if (statusCode == 200) {
      // Handle response data
      res.on('data', function(trunk) {
        buffers.push(trunk);
      });
      // Handle response end
      res.on('end', function() {
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
  });

  // Handle request error
  req.on('error', function() {
    process.stdout.write('\x07');
    console.log('[Error]    Request error');
    // Error callback
    error();
  });
}

// Add an item into the table
function addToTable(query, success) {
  console.log('[Log]      ' + query);
  // Handle sql query
  mysqlConn.query(query, function(err, rows, fields) {
    success();
  });
};


//////////////////////////////////////////////////////////////////////////////////////////////////
function craw() {
  console.log('\n[Log]: Try crawling: ' + albumIdx + '.' + songIdx);

  var album_link = 'http://www.25xz.com/MusicList/cococmp3.cn_' + albumIdx + '.html';
  getPageContent(album_link, function(album_pageContent) {
    console.log('[Success]  Access url: ' + album_link);

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
        console.log('[Success]  Access url: ' + player_link);

        var $ = cheerio.load(player_pageContent),
          source_link = 'http://bama.25xz.com/' + $('.Play').find('script').html().replace(/^(?:var)\sr_url\s=\s\"/, '').replace(/\?.+$/, '');
        addToTable('INSERT INTO himalayan_songs (song, artist, album, source, source_link) values ("' + song + '","' + artist + '","' + album + '","' + source + '", "' + source_link + '")', function() {
          console.log('[Success]  Add an item to database');

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


////////////////////////////////////////////////////////////////////////////////////////////////////
craw();