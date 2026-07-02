
var lib = (function( $ ){

  var lib     = {};
  var classes = {};
  var waiters = [];
  var ready   = false;

  // -------------------------------------------------------------------------------------------- //

  lib._classes = classes;

  // -------------------------------------------------------------------------------------------- //

  lib.require = function( reqs, cb ){
    waiters.push({
      reqs  : reqs,
      cb    : cb
    });
    _updateWaiters();
  };

  // -------------------------------------------------------------------------------------------- //

  lib.register = function( clasName, reqs, cb ){
    lib.require( reqs, function(){
      classes[ clasName ] = cb.apply( null, arguments );
      _updateWaiters();
    });
  };

  // -------------------------------------------------------------------------------------------- //

  /**
   * @brief Makes `Base` inherit from `Super`.
   *
   * {Object} inherits( {Function} Base, {Function} Super )
   *
   * @param {Function} Base  The base class to have inherit from `Super`.
   * @param {Function} Super The super class to inherit from.
   *
   * @return {Object} The base class' prototype.
   */
  lib.inherits = (
    $.isFunction( Object.create ) ?
    function( Base, Super ){
      var baseProto = Base.prototype = Object.create( Super.prototype );
      baseProto.constructor = Base;
      baseProto._super = function( method, args ){
        return Super.prototype[ method ].apply( this, args );
      };
      return baseProto;
    } :
    function( Base, Super ){
      var Tmp = $.noop;
      Tmp.prototype = Super.prototype;
      Tmp.prototype.constructor = Super;
      var baseProto = Base.prototype = new Tmp();
      baseProto.constructor = Base;
      baseProto._super = function( method, args ){
        return Super.prototype[ method ].apply( this, args );
      };
      return baseProto;
    }
  );

  // -------------------------------------------------------------------------------------------- //

  function _updateWaiters(){
    // Don't call anyone until the DOM is ready.
    if( !ready ){
      return;
    }

    // Pull out all the waiting functions whose requirements are ready.
    var reqsReady = [];
    var i;
    for( i = 0; i < waiters.length; ++i ){
      var waiter = waiters[ i ];
      if( _reqsAvailable( waiter.reqs ) ){
        reqsReady.push( waiter );
        waiters.splice( i, 1 );
        --i;
      }
    }

    // Call all the ready functions.
    for( i = 0; i < reqsReady.length; ++i ){
      var waiter = reqsReady[ i ];
      var reqs = waiter.reqs.map(function( name ){ return classes[ name ]; });
      waiter.cb.apply( null, reqs );
    }
  }

  // -------------------------------------------------------------------------------------------- //

  function _reqsAvailable( reqs ){
    for( var i = 0; i < reqs.length; ++i ){
      if( !classes[ reqs[ i ] ] ){
        return false;
      }
    }
    return true;
  }

  // -------------------------------------------------------------------------------------------- //

  $(function(){
    ready = true;
    _updateWaiters();
  })

  // -------------------------------------------------------------------------------------------- //

  return lib;
})( jQuery );
/* global lib */

lib.register( 'BasicController', [], function(){
  function BasicController(){
  }
  var BasicControllerPrototype = BasicController.prototype;

  // -------------------------------------------------------------------------------------------- //

  return BasicController;
});
/* global lib */

lib.register(
  'CameraController',
  [ 'BasicController', 'KeyState' ],
  function( BasicController, KeyState ){

    var PAN_SPEED = 0.02; // Tiles per millisecond.
  
    // ------------------------------------------------------------------------------------------ //

    function CameraController( camera ){
      BasicController.call( this );
      this.camera = camera;
    }
    lib.inherits( CameraController, BasicController );
    var CameraControllerPrototype = CameraController.prototype;
  
    // ------------------------------------------------------------------------------------------ //

    CameraControllerPrototype.update = function( time ){
      var KEYS      = KeyState.KEYS;
      var keyState  = KeyState.instance;
      var camera    = this.camera;

      // Vertical movement.
      if( keyState.isPressed( KEYS.W ) ){
        camera.setYVelocity( -PAN_SPEED );
      }
      else if( keyState.isPressed( KEYS.S ) ){
        camera.setYVelocity( PAN_SPEED );
      }
      else {
        camera.setYVelocity( 0 );
      }

      // Horizontal movement.
      if( keyState.isPressed( KEYS.A ) ){
        camera.setXVelocity( -PAN_SPEED );
      }
      else if( keyState.isPressed( KEYS.D ) ){
        camera.setXVelocity( PAN_SPEED );
      }
      else {
        camera.setXVelocity( 0 );
      }

      // Vertical movement.
      if( keyState.isPressed( KEYS.E ) ){
        camera.setZVelocity( -PAN_SPEED / 2 );
      }
      else if( keyState.isPressed( KEYS.Q ) ){
        camera.setZVelocity( PAN_SPEED / 2 );
      }
      else {
        camera.setZVelocity( 0 );
      }
    };

    // ------------------------------------------------------------------------------------------ //
  
    return CameraController;
  }
);
/* global lib, $, window */

lib.register( 'KeyState', [], function(){
  function KeyState(){
    this.keyStates = {};
  }
  var KeyStatePrototype = KeyState.prototype;

  // -------------------------------------------------------------------------------------------- //

  var KEYS = KeyState.KEYS = {
    A       : '_65',
    B       : '_66',
    C       : '_67',
    D       : '_68',
    E       : '_69',
    F       : '_70',
    G       : '_71',
    H       : '_72',
    I       : '_73',
    J       : '_74',
    K       : '_75',
    L       : '_76',
    M       : '_77',
    N       : '_78',
    O       : '_79',
    P       : '_80',
    Q       : '_81',
    R       : '_82',
    S       : '_83',
    T       : '_84',
    U       : '_85',
    V       : '_86',
    W       : '_87',
    X       : '_88',
    Y       : '_89',
    Z       : '_90',
    UP      : '_38',
    DOWN    : '_40',
    LEFT    : '_37',
    RIGHT   : '_38',
    ONE     : '_49',
    TWO     : '_50',
    THREE   : '_51',
    FOUR    : '_52',
    FIVE    : '_53',
    SIX     : '_54',
    SEVEN   : '_55',
    EIGHT   : '_56',
    NINE    : '_57',
    ZERO    : '_48',
    SHIFT   : '_16',
    ALT     : '_18',
    META    : '_91',
    CONTROL : '_17',
    TAB     : '_9',
    TILDA   : '_192',
    MINUS   : '_189',
    EQUALS  : '_187',
  };

  // -------------------------------------------------------------------------------------------- //

  KeyStatePrototype.isPressed = function( key ){
    return Boolean( this.keyStates[ key ] );
  };

  // -------------------------------------------------------------------------------------------- //

  $(function(){
    $( window ).keydown(function( e ){
      var keyStates = KeyState.instance.keyStates;
      keyStates[ '_' + e.keyCode  ] = true;
      keyStates[ KEYS.SHIFT       ] = e.shiftKey;
      keyStates[ KEYS.CONTROL     ] = e.ctrlKey;
      keyStates[ KEYS.META        ] = e.metaKey;
    });
    $( window ).keyup(function( e ){
      var keyStates = KeyState.instance.keyStates;
      keyStates[ '_' + e.keyCode  ] = false;
      keyStates[ KEYS.SHIFT       ] = e.shiftKey;
      keyStates[ KEYS.CONTROL     ] = e.ctrlKey;
      keyStates[ KEYS.META        ] = e.metaKey;
    });
  });

  // -------------------------------------------------------------------------------------------- //

  KeyState.instance = new KeyState();
  return KeyState;
});
/* global lib */

lib.register( 'BasicObject', [], function(){
  function BasicObject(){
    this.id = _makeId();
    this._x = this.x = 0;
    this._y = this.y = 0;
    this._z = this.z = 0;
    this.velocity = [ 0, 0, 0 ];
  }
  var BasicObjectPrototype = BasicObject.prototype;

  // -------------------------------------------------------------------------------------------- //

  BasicObjectPrototype.setVelocity = function( x, y, z ){
    this.velocity = [ x, y, z ];
  };

  // -------------------------------------------------------------------------------------------- //

  BasicObjectPrototype.setXVelocity = function( x ){
    this.velocity[ 0 ] = x;
  };

  // -------------------------------------------------------------------------------------------- //

  BasicObjectPrototype.setYVelocity = function( y ){
    this.velocity[ 1 ] = y;
  };
  // -------------------------------------------------------------------------------------------- //

  BasicObjectPrototype.setZVelocity = function( z ){
    this.velocity[ 2 ] = z;
  };

  // -------------------------------------------------------------------------------------------- //

  BasicObjectPrototype.setPosition = function( x, y, z ){
    this.x = Math.round( this._x = x );
    this.y = Math.round( this._y = y );
    this.z = Math.round( this._z = z );
  };

  // -------------------------------------------------------------------------------------------- //

  BasicObjectPrototype.setXPosition = function( x ){
    this.x = Math.round( this._x = x );
  };

  // -------------------------------------------------------------------------------------------- //

  BasicObjectPrototype.setYPosition = function( y ){
    this.y = Math.round( this._y = y );
  };

  // -------------------------------------------------------------------------------------------- //

  BasicObjectPrototype.setXPosition = function( z ){
    this.z = Math.round( this._z = z );
  };

  // -------------------------------------------------------------------------------------------- //

  BasicObjectPrototype.update = function( time ){
    // Update our position based on our velocity and the time passed.
    this.x = Math.round( this._x += this.velocity[ 0 ] * time );
    this.y = Math.round( this._y += this.velocity[ 1 ] * time );
    this.z = Math.round( this._z += this.velocity[ 2 ] * time );
  };

  // -------------------------------------------------------------------------------------------- //

  function _makeId(){
    function _makeIdPiece(){
      var piece = String( parseInt( Math.random() * 1000000000, 10 ) );
      while( piece.length < 9 ){
        piece += '0';
      }
      return piece;
    }

    return _makeIdPiece() + _makeIdPiece();
  };

  // -------------------------------------------------------------------------------------------- //

  return BasicObject;
});
/* global lib */

lib.register( 'Camera', [ 'BasicObject' ], function( BasicObject ){
  function Camera(){
    BasicObject.apply( this, arguments );
  }
  lib.inherits( Camera, BasicObject );

  // -------------------------------------------------------------------------------------------- //

  return Camera;
});
/* global lib */

lib.register( 'Octree', [], function(){
  var Cell = (function(){
    function Cell( x, y, width, height ){
      this.nw = null;
      this.ne = null;
      this.se = null;
      this.sw = null;
      
    }
    
    return Cell;
  })

  // -------------------------------------------------------------------------------------------- //

  function Octree( width, height ){
    this.tree = new Cell( 0, 0, width, height );
  }
  var OctreePrototype = Octree.prototype;

  // -------------------------------------------------------------------------------------------- //



  // -------------------------------------------------------------------------------------------- //

  return Octree;
});
/* globals lib */

lib.register( 'Viewport', [ 'World' ], function( World ){
  function Viewport( $view ){
    this.$view = $view;
  }
  var ViewportPrototype = Viewport.prototype;

  // -------------------------------------------------------------------------------------------- //

  ViewportPrototype.setFoV = function( width, height ){
    this.width  = width;
    this.height = height;
  };

  // -------------------------------------------------------------------------------------------- //

  ViewportPrototype.setCamera = function( camera ){
    this.camera = camera;
  };

  // -------------------------------------------------------------------------------------------- //

  ViewportPrototype.render = function(){
    var camera      = this.camera;
    var world       = camera.world;
    var layer       = world.getLayer( camera.z );
    var camOffX     = camera.x;
    var camOffY     = camera.y;
    var z           = camera.z;
    var width       = this.width;
    var height      = this.height;
    var worldWidth  = world.width;
    var worldHeight = world.height;
    var cells       = '<div class="layer">';

    for( var i = 0; i < height; ++i ){
      var y = camOffY + i;
      cells += '<div class="row">';
      for( var k = 0; k < width; ++k ){
        var x = camOffX + k;
        var cell;
        if( y >= worldHeight || x >= worldWidth ){
          cell = _makeCell();
        }
        else {
          cell = _makeCell( world.getTile( x, y, z ) );
        }
        cells += cell;
      }
      cells += '</div>';
    }
    this.$view.html( cells + '</div>' );
  };

  // -------------------------------------------------------------------------------------------- //

  function _makeCell( tile ){
    var cell = '<div class="cell ';
    if( !tile ){
      cell += 'empty';
    }
    else {
      cell += World.TILE_TYPE_NAMES[ tile.type ].toLowerCase();
    }
    return cell + '"></div>';
  }

  // -------------------------------------------------------------------------------------------- //

  return Viewport;
});
/* global lib */

/**
 * @class World
 * 
 * @brief Contains the map of the world and all objects therein.
 * 
 * Tiles within the world are organized by layer, row, then column or Z, Y, X. This arrangement is
 * intended to optimize tile access for layers (Z) and rows (Y). The origin tile (0,0,0) is at the
 * top, back, left of the world.
 * 
 * This is an example unit-world. The top layer is bounded by the points (0,0,0), (0,0,1), (0,1,1),
 * and (0,1,0) in clock-wise order from top-left. The floating point (1,0,1) is hidden in the back
 * of the world. Note that all these coordinates are in z, y, x, order.
 * @code
 *     0,0,0        0,0,1
 *       *--------------*
 *       |\              \
 *       | \              \
 *       |  \ 0,1,0        \
 *       |   *--------------* 0,1,1
 *       |   |              |
 * 1,0,0 *   |          *   |
 *        \  |        1,0,1 |
 *         \ |              |
 *          \|              |
 *           *--------------*
 *         1,1,0        1,1,1
 * @end_code
 * 
 * Even though the world stores everything in Z, Y, X order, all functions expect X, Y, Z order as
 * that is usually easier for people to understand.
 */
lib.register( 'World', [ 'noise' ], function( noise ){
  var TILE_TYPES = {
    GRASS : 0,
    BUSH  : 1,
    TREE  : 2
  };
  var TILE_TYPE_NAMES = Object.keys( TILE_TYPES );
  var TILE_TYPE_COUNT = TILE_TYPE_NAMES.length;
  var NOISE_SCALE     = 200;
  var Z_SCALE         = 75;
  var BIG_SCALE       = 1;
  var MEDIUM_SCALE    = 2;
  var SMALL_SCALE     = 3;
  var DENSITY_SCALE   = 512;
  var SOLID_POINT     = 50;

  // -------------------------------------------------------------------------------------------- //

  function World(){
    this.tiles        = undefined;
    this.objects      = {};
    this.controllers  = {};
  }
  var WorldPrototype = World.prototype;

  // -------------------------------------------------------------------------------------------- //

  World.TILE_TYPES      = TILE_TYPES;
  World.TILE_TYPE_NAMES = TILE_TYPE_NAMES;

  // -------------------------------------------------------------------------------------------- //

  var Tile = (function(){
    function Tile( typeId ){
      this.type = typeId;
    }

    return Tile;
  })();

  // -------------------------------------------------------------------------------------------- //

  WorldPrototype.generate = function( x, y, z ){
    this.width  = x = parseInt( x, 10 );
    this.height = y = parseInt( y, 10 );
    this.depth  = z = parseInt( z, 10 );

    // var large       = new noise.Simplex3D( 0.07103920564986765  );
    // var medium      = new noise.Simplex3D( 0.1194343869574368   );
    // var small       = new noise.Simplex3D( 0.3741140146739781   );
    var large       = new noise.Simplex3D( Math.random() );
    var medium      = new noise.Simplex3D( Math.random() );
    var small       = new noise.Simplex3D( Math.random() );
    var bigNoise    = NOISE_SCALE / BIG_SCALE;
    var mediumNoise = NOISE_SCALE / MEDIUM_SCALE;
    var smallNoise  = NOISE_SCALE / SMALL_SCALE;

    var tiles = this.tiles = new Array( z );
    for( var k = 0; k < z; ++k ){
      var layer = tiles[ k ] = new Array( y );

      for( var j = 0; j < y; ++j ){
        var row = layer[ j ] = new Array( x );

        for( var i = 0; i < x; ++i ){
          var l = large .generate( i / bigNoise,    j / bigNoise,     k / Z_SCALE ) / BIG_SCALE;
          var m = medium.generate( i / mediumNoise, j / mediumNoise,  k / Z_SCALE ) / MEDIUM_SCALE;
          var s = small .generate( i / smallNoise,  j / smallNoise,   k / Z_SCALE ) / SMALL_SCALE;
          var value = (l + m + s) * DENSITY_SCALE * (k * k / z);

          if( value > SOLID_POINT ){
            row[ i ] = new Tile( parseInt( Math.random() * TILE_TYPE_COUNT, 10 ) );
          }
        }
      }
    }
  };

  // -------------------------------------------------------------------------------------------- //

  WorldPrototype.update = function( time ){
    _updateAll( this.controllers, time );
    _updateAll( this.objects,     time );
  };

  // -------------------------------------------------------------------------------------------- //

  WorldPrototype.getLayer = function( z ){
    return this.tiles[ z ];
  };

  // -------------------------------------------------------------------------------------------- //

  WorldPrototype.getTile = function( x, y, z ){
    if( x < 0 || y < 0 || y >= this.height || z < 0 || z >= this.depth ){
      return undefined;
    }
    return this.tiles[ z ][ y ][ x ];
  };

  // -------------------------------------------------------------------------------------------- //

  WorldPrototype.addObject = function( obj ){
    this.objects[ obj.id ] = obj;
    obj.world = this;
  };

  // -------------------------------------------------------------------------------------------- //

  WorldPrototype.addController = function( controller ){
    this.controllers[ controller.id ] = controller;
    controller.world = this;
  };

  // -------------------------------------------------------------------------------------------- //

  function _updateAll( items, time ){
    for( var id in items ){
      if( !items.hasOwnProperty( id ) ){
        continue;
      }

      items[ id ].update( time );
    }
  }

  // -------------------------------------------------------------------------------------------- //

  return World;
});
/* global jQuery, lib */

(function( $, window ){
  var STEP_TIME = 1000 / 15;

  var world     = null;
  var viewport  = null;

  lib.require(
    [ 'World', 'Viewport', 'Camera', 'CameraController' ],
    function( World, Viewport, Camera, CameraController ){
      world     = new World();
      viewport  = new Viewport( $( '#viewer' ) );
  
      var camera      = new Camera();
      var cameraCtrl  = new CameraController( camera );

      //               X    Y   Z
      world.generate( 500, 500, 100 );
      // Place camera on the first Z level with terrain at the center
      for( var s = 0; s < 100; s++ ){
        if( world.getTile( 250, 250, s ) ){ camera.setPosition( 250, 250, s ); break; }
      }
      viewport.setFoV( 200, 125    );
  
      viewport.setCamera( camera );
      world.addObject( camera );
      world.addController( cameraCtrl );

      _render();
    }
  );

  var previousRenderTime = Date.now();
  function _render(){
    world.update( STEP_TIME );
    viewport.render();

    var cam = viewport.camera;
    $( '.x-pos' ).text( cam.x );
    $( '.y-pos' ).text( cam.y );
    $( '.z-pos' ).text( cam.z );

    setTimeout( _render, STEP_TIME );
  }
})( jQuery, window );
/* global lib, $, window */
// Adaptation of Joseph Gentle's JS port (https://github.com/josephg/noisejs) of Peter Eastman's
// (peastman@drizzle.stanford.edu) optimized version of Stefan Gustavson's (stegu@itn.liu.se)
// implementation of Ken Perlin's Simplex noise algorithm.
//
// This code was put in public domain by Stefan Gustavson. Use it as you like, but see how long you
// can chain the attribution. :)

lib.register( 'noise', [], function(){
  /**
   * @class Grad
   * @brief 
   */
  var Grad = (function(){
    function Grad( x, y, z ){
      this.x = x;
      this.y = y;
      this.z = z;
    }
    var GradPrototype = Grad.prototype;

    // ------------------------------------------------------------------------------------------ //

    GradPrototype.dot2 = function (x, y) {
      return this.x * x + this.y * y;
    };

    // ------------------------------------------------------------------------------------------ //

    GradPrototype.dot3 = function (x, y, z) {
      return this.x * x + this.y * y + this.z * z;
    };
    
    return Grad;
  })();

  // -------------------------------------------------------------------------------------------- //

  var grad3 = [
    new Grad(1, 1, 0), new Grad(-1, 1, 0), new Grad(1, -1, 0), new Grad(-1, -1, 0),
    new Grad(1, 0, 1), new Grad(-1, 0, 1), new Grad(1, 0, -1), new Grad(-1, 0, -1),
    new Grad(0, 1, 1), new Grad(0, -1, 1), new Grad(0, 1, -1), new Grad(0, -1, -1)
  ];

  // -------------------------------------------------------------------------------------------- //

  var p = [
    151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140,
    36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234,
    75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237,
    149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48,
    27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105,
    92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73,
    209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86,
    164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38,
    147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189,
    28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101,
    155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232,
    178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12,
    191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31,
    181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254,
    138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215,
    61, 156, 180
  ];

  // -------------------------------------------------------------------------------------------- //

  var Generator = (function(){
    function Generator( seed ){
      _seed.call( this, seed || 0 );
    }

    // ------------------------------------------------------------------------------------------ //

    // This isn't a very good seeding function, but it works ok. It supports 2^16 different seed
    // values. Write something better if you need more seeds.
    function _seed( seed ){
      if( seed > 0 && seed < 1 ){
        // Scale the seed out
        seed *= 65536;
      }
    
      seed = Math.floor( seed );
      if( seed < 256 ){
        seed |= seed << 8;
      }
    
      // To remove the need for index wrapping, double the permutation table length
      var perm  = this.perm   = new Array(512);
      var gradP = this.gradP  = new Array(512);
      for( var i = 0; i < 256; i++ ){
        var v;
        if( i & 1 ){
          v = p[i] ^ (seed & 255);
        }
        else {
          v = p[i] ^ ((seed >> 8) & 255);
        }
    
        perm[   i ] = perm[   i + 256 ] = v;
        gradP[  i ] = gradP[  i + 256 ] = grad3[v % 12];
      }
    }
    
    // ------------------------------------------------------------------------------------------ //

    return Generator;
  })();

  // -------------------------------------------------------------------------------------------- //

  var noise = {};

  // -------------------------------------------------------------------------------------------- //

  noise.Simplex3D = (function(){

    // Skewing and unskewing factors for 3 dimensions.
    var F3 = 1 / 3;
    var G3 = 1 / 6;

    // ------------------------------------------------------------------------------------------ //

    function Simplex3D( seed ){
      Generator.call( this, seed );
    }
    lib.inherits( Simplex3D, Generator );
    var Simplex3DPrototype = Simplex3D.prototype;

    // ------------------------------------------------------------------------------------------ //

    Simplex3DPrototype.generate = function( xin, yin, zin ){
      var n0, n1, n2, n3; // Noise contributions from the four corners

      // Skew the input space to determine which simplex cell we're in
      var s = (xin + yin + zin) * F3;
      var i = Math.floor( xin + s );
      var j = Math.floor( yin + s );
      var k = Math.floor( zin + s );

      // The x, y, and z distances from the cell origin, unskewed.
      var t = (i + j + k) * G3;
      var x0 = xin - i + t;
      var y0 = yin - j + t;
      var z0 = zin - k + t;

      // For the 3D case, the simplex shape is a slightly irregular tetrahedron.
      // Determine which simplex we are in.
      var i1, j1, k1; // Offsets for second corner of simplex in (i,j,k) coords
      var i2, j2, k2; // Offsets for third corner of simplex in (i,j,k) coords
      if( x0 >= y0 ){
        if( y0 >= z0 ){
          i1 = 1;
          j1 = 0;
          k1 = 0;
          i2 = 1;
          j2 = 1;
          k2 = 0;
        }
        else if( x0 >= z0 ){
          i1 = 1;
          j1 = 0;
          k1 = 0;
          i2 = 1;
          j2 = 0;
          k2 = 1;
        }
        else {
          i1 = 0;
          j1 = 0;
          k1 = 1;
          i2 = 1;
          j2 = 0;
          k2 = 1;
        }
      }
      else {
        if( y0 < z0 ){
          i1 = 0;
          j1 = 0;
          k1 = 1;
          i2 = 0;
          j2 = 1;
          k2 = 1;
        }
        else if( x0 < z0 ){
          i1 = 0;
          j1 = 1;
          k1 = 0;
          i2 = 0;
          j2 = 1;
          k2 = 1;
        }
        else {
          i1 = 0;
          j1 = 1;
          k1 = 0;
          i2 = 1;
          j2 = 1;
          k2 = 0;
        }
      }
      // A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z),
      // a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and
      // a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where
      // c = 1/6.
      var x1 = x0 - i1 + G3; // Offsets for second corner
      var y1 = y0 - j1 + G3;
      var z1 = z0 - k1 + G3;

      var x2 = x0 - i2 + 2 * G3; // Offsets for third corner
      var y2 = y0 - j2 + 2 * G3;
      var z2 = z0 - k2 + 2 * G3;

      var x3 = x0 - 1 + 3 * G3; // Offsets for fourth corner
      var y3 = y0 - 1 + 3 * G3;
      var z3 = z0 - 1 + 3 * G3;

      // Work out the hashed gradient indices of the four simplex corners
      i &= 255;
      j &= 255;
      k &= 255;
      var gradP = this.gradP;
      var perm  = this.perm;
      var gi0 = gradP[ i      + perm[ j       + perm[ k       ] ] ];
      var gi1 = gradP[ i + i1 + perm[ j + j1  + perm[ k + k1  ] ] ];
      var gi2 = gradP[ i + i2 + perm[ j + j2  + perm[ k + k2  ] ] ];
      var gi3 = gradP[ i + 1  + perm[ j + 1   + perm[ k + 1   ] ] ];

      // Calculate the contribution from the four corners
      var t0 = 0.5 - x0 * x0 - y0 * y0 - z0 * z0;
      if( t0 < 0 ){
        n0 = 0;
      }
      else {
        t0 *= t0;
        n0 = t0 * t0 * gi0.dot3( x0, y0, z0 );
      }

      var t1 = 0.5 - x1 * x1 - y1 * y1 - z1 * z1;
      if( t1 < 0 ){
        n1 = 0;
      }
      else {
        t1 *= t1;
        n1 = t1 * t1 * gi1.dot3( x1, y1, z1 );
      }

      var t2 = 0.5 - x2 * x2 - y2 * y2 - z2 * z2;
      if( t2 < 0 ){
        n2 = 0;
      }
      else {
        t2 *= t2;
        n2 = t2 * t2 * gi2.dot3( x2, y2, z2 );
      }

      var t3 = 0.5 - x3 * x3 - y3 * y3 - z3 * z3;
      if( t3 < 0 ){
        n3 = 0;
      }
      else {
        t3 *= t3;
        n3 = t3 * t3 * gi3.dot3( x3, y3, z3 );
      }

      // Add contributions from each corner to get the final noise value.
      // The result is scaled to return values in the interval [-1,1].
      return 32 * (n0 + n1 + n2 + n3);
    };

    // ------------------------------------------------------------------------------------------ //

    return Simplex3D;
  })();

  // -------------------------------------------------------------------------------------------- //

  return noise;

});
