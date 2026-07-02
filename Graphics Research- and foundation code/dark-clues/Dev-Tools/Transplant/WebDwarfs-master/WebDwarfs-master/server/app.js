var express   = require( 'express' );
var stylus    = require( 'stylus' );
var compiler  = require( 'resource-compiler' );
var path = require('path');

var app = express();

const CLIENT_DIR = path.resolve(__dirname, '..', 'client');

app.set( 'views',       CLIENT_DIR + '/views' );
app.set( 'view engine', 'jade'  );
app.set( 'view cache',  false   );

// Static content generation.
app.use(
  '/styles',
  stylus.middleware({
    src     : CLIENT_DIR + '/styles',
    dest    : CLIENT_DIR + '/static/styles',
    compile : function( str, path ){
      var res = stylus( str ).set( 'filename', path );
      return res;
    }
  })
);
app.use(
    '/scripts',
    compiler.combiner(
        function( path, data, callback ){
            callback( null, data );
        }, {
            src     : CLIENT_DIR + '/scripts',
            dest    : CLIENT_DIR + '/static/scripts',
            ext     : '.js'
        }
    )
);
app.use( express.static( CLIENT_DIR + '/static' ) );

app.get( '/', function( req, res ){
  res.redirect( '/game' );
});

app.get( '/game', function( req, res ){
  res.render( 'game' );
});

function tryPort(port) {
  var server = app.listen(port);
  server.on('error', function(err) {
    server.removeAllListeners();
    if (err.code === 'EADDRINUSE') {
      tryPort(port + 1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
  
  server.once('listening', function() {
    console.log('Server listening on port ' + port);
    console.log('Open http://localhost:' + port + '/game');
  });
}

var port = +(process.env.PORT || 3000);
tryPort(port);
