import m     from 'mithril'
import proxy from 'proximamente'

// Convenience function: loop over object's own properties, apply iterator to each value and assign back to same property on a new object
const map = ( source, iterator ) => {
  var output = {}

  for( let key in source )
    if( source.hasOwnProperty( key ) )
      output[ key ] = iterator( source[ key ], key )

  return output
}

// Transforms a root component to proxy its constituent functions
const root = component =>
  map( component, ( value, key ) =>
    key in traps.root ? proxy( value, traps[ key ], traps.root[ key ] ) : value
  )

const traps = {
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
const proxies = {
  m : proxy( () => [ traps.m, m =>
    ( ...input ) =>
      m( ...input.map( node =>
        ( node instanceof Object )
        ? map( node, ( value, key ) =>
          key in traps ? proxy( value, traps[ key ] ) : value
        )
        : node
      ) )
  ] ),

  // Mount & route both need to isolate root level components in order to lay extra traps
  mount : proxy( () => [ traps.mount, mount =>
    ( el, component ) =>
      mount( el, root( component ) )
  ] ),

  route : proxy( () => [ traps.route, route =>
    ( el, path, hash ) =>
      ( !el || !el.nodeType )
      ? route.apply( this, arguments )
      : route( el, path, map( hash, root ) )
  ] )
}

export default Object.assign(
  proxy.m,
  map( mithril, ( value, key ) => {
    if( value instanceof Function ){
      traps[ key ] = [ value ]

      return Object.assign(
        proxies[ key ] || proxy( () => [ traps[ key ] ] ),

        value
      )
    }

    return value
  } )
)

export { traps as traps }
