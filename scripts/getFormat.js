var mysql = require('mysql');

var mysqlConn = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  database: 'himalayan'
});
mysqlConn.connect();

(function add(i) {
  var query = 'select song_id, source_link from himalayan_songs limit ' + i + ',1;';
  mysqlConn.query(query, function(err, rows, fields) {
    var id = rows[0].song_id,
      link = rows[0].source_link,
      format = link.substr(link.length - 3).toLowerCase();
    var add_query = 'update himalayan_songs set source_format = "' + format + '" where song_id = ' + id + ';';
    mysqlConn.query(add_query, function(err, rows, fields) {
      console.log(add_query);
      if (i < 21356) {
        add(i + 1);
      }
    });
  });
})(0);