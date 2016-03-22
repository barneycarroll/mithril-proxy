( function( root, factory ){
       if ( typeof define === 'function' && define.amd )
    define( [ 'm', 'proximamente' ], factory )

  else if ( typeof exports === 'object'  && typeof exports.nodeName !== 'string' )
    module.exports = factory( require( 'm' ), require( 'proximamente' ) )

  else
    ( root || window ).m = factory( ( root || window ).m )
} )( this, function mithrilProxies( mithril, proxy ){
  // Convenience function: loop over object's own properties, apply iterator to each value and assign back to same property on a new object
  function map( source, iterator ){
    var output = {}

    for( var key in source )
      if( source.hasOwnProperty( key ) )
        output[ key ] = iterator( source[ key ], key )

    return output
  }

  // Transforms a root component to proxy its constituent functions
  function root( component ){
    return map( component, function proxyRootComponent( value, key ){
      return key in traps.root ? proxy( value, traps[ key ], traps.root[ key ] ) : value
    } )
  }

  // Single array reference for repeated concatenation operations
  var array = []

  var traps = {
    // Abstract Mithril API representing core application constructs.
    // These are applied at runtime and take application code as their base input
    // (via traps laid on the public API)
    view       : [],
    controller : [],
    root : {
      view       : [],
      controller : []
    }
  }

  // Public API proxies
  var proxies = {
    m : proxy( array.concat.bind( array, traps.m, function( m ){
      return function mTrap(){
        var output = []

        for( var i = 0; i < arguments.length; i++ )
          output[ i ] = node instanceof Object
            ? map( arguments[ i ], function proxyComponent( value, key ){
              return key in traps ? proxy( value, traps[ key ] ) : value
            } )
            : arguments[ i ]

        // Needs to loop over contents to proxy component methods
        m.apply( this, output );
      }
    } ) ),

    // Mount & route both need to isolate root level components in order to lay extra traps
    mount : proxy( array.concat.bind( array, traps.mount, function( mount ){
      return function mountTrap( el, component ){
        return mount( el, root( component ) )
      }
    } ) ),

    route : proxy( array.concat.bind( array, traps.route, function( route ){
      return function routeTrap( el, path, hash ){
        return ( !el || !el.nodeType )
        ? route.apply( this, arguments )
        : route( el, path, map( hash, root ) )
      }
    } ) )
  }

  // Build the API
  var API = proxies.m

  // Selectively map Mithril's API
  for( var key in mithril ) if( mithril.hasOwnProperty( key ) ){
    var value = mithril[ key ]

    // Functions all need proxying
    if( value instanceof Function ){
      // Create a list of traps, terminating with the original interface
      traps[ key ] = [ value ]

      // Use either special proxies above or create new ones
      API[ key ] = proxies[ key ] || proxy( array.concat.bind( array, traps[ key ] ) )

      // Map API method sub-properties
      for( var subKey in value ) if( value.hasOwnProperty( subKey ) )
        API[ key ][ subKey ] = value[ subKey ]
    }
    // Every static property is just an alias
    else {
      API[ key ] = value
    }
  }

  // Expose traps
  API.traps = traps

  return API
} );
