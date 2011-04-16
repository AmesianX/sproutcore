// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('system/browser');
sc_require('system/event');
sc_require('system/responder') ;
sc_require('system/theme');

sc_require('system/string') ;

SC.CoreView = SC.Responder.extend(
/** @scope SC.CoreView.prototype */ {

  concatenatedProperties: ['classNames'],

  /**
    If the view is currently inserted into the DOM of a parent view, this
    property will point to the parent of the view.
  */
  parentView: null,

  // ..........................................................
  // CHILD VIEW SUPPORT
  //

  /**
    Array of child views.  You should never edit this array directly unless
    you are implementing createChildViews().  Most of the time, you should
    use the accessor methods such as appendChild(), insertBefore() and
    removeChild().

    @property {Array}
  */
  childViews: [],

  // ..........................................................
  // ELEMENT SUPPORT
  //

  /**
    Returns the current DOM element for the view.

    @property {DOMElement} the element
  */
  element: function(key, value) {
    // If the value of element is being set, just return it. SproutCore
    // will cache it for further `get` calls.
    if (value !== undefined) { return value; }

    var parent = this.get('parentView');
    if (parent) { parent = parent.get('element'); }
    if (parent) { return this.findElementInParentElement(parent); }
  }.property('parentView').cacheable(),

  /**
    Returns a jQuery object for this view's element. If you pass in a selector
    string, this method will return a jQuery object, using the current element
    as its context.

    For example, calling `view.$('li')` will return a jQuery object containing
    all of the `li` elements inside the DOM element of this view.

    @param {String} [selector] a jQuery-compatible selector string
    @returns {SC.CoreQuery} the CoreQuery object for the DOM node
  */
  $: function(sel) {
    var elem = this.get('element') ;

    if (!elem) {
      return SC.$();
    } else if (sel === undefined) {
      return SC.$(elem);
    } else {
      return SC.$(sel, elem);
    }
  },

  /**
    Appends the view's element to the specified parent element.

    If the view does not have an HTML representation yet, `createElement()`
    will be called automatically.

    @param {String|DOMElement|jQuery} A selector, element, HTML string, or jQuery object
    @returns {SC.View} receiver
  */
  appendTo: function(target) {
    var elem = this.get('element');
    if (!elem) { this.createElement(); }

    this.$().appendTo(target);
    return this;
  },

  /**
    Appends the view's element to the document body. If the view does
    not have an HTML representation yet, `createElement()` will be called
    automatically.

    @returns {SC.View} receiver
  */
  append: function() {
    return this.appendTo(document.body);
  },

  /**
    The ID to use when trying to locate the layer in the DOM.  If you do not
    set the layerId explicitly, then the view's GUID will be used instead.
    This ID must be set at the time the view is created.

    @property {String}
    @readOnly
  */
  elementId: function(key, value) {
    if (value) { return value; }
    return SC.guidFor(this) ;
  }.property().cacheable(),

  /**
    Attempts to discover the layer in the parent layer.  The default
    implementation looks for an element with an ID of layerId (or the view's
    guid if layerId is null).  You can override this method to provide your
    own form of lookup.  For example, if you want to discover your layer using
    a CSS class name instead of an ID.

    @param {DOMElement} parentLayer the parent's DOM layer
    @returns {DOMElement} the discovered layer
  */
  findElementInParentElement: function(parentElem) {
    var id = "#" + this.get('elementId');
    return jQuery(id)[0] || jQuery(id, parentElem)[0] ;
  },

  /**
    Creates a new renderContext with the passed tagName or element.  You
    can override this method to provide further customization to the context
    if needed.  Normally you will not need to call or override this method.

    @returns {SC.RenderContext}
  */
  renderContext: function(tagNameOrElement) {
    return SC.RenderContext(tagNameOrElement) ;
  },

  /**
    Creates a DOM representation of the view and all of its
    child views by recursively calling the `render()` method.

    After the element has been created, `didCreateElement` will
    be called on this view and all of its child views.

    @returns {SC.View} receiver
  */
  createElement: function() {
    if (this.get('element')) { return this ; } // nothing to do

    var context = this.renderContext(this.get('tagName')) ;

    // now prepare the content like normal.
    this.renderToContext(context) ;
    this.set('element', context.element());

    // now notify the view and its child views..
    this._notifyDidCreateElement() ;

    return this ;
  },

  didCreateElement: function() {},

  /** @private -
    Invokes the receivers didCreateLayer() method if it exists and then
    invokes the same on all child views.
  */
  _notifyDidCreateElement: function() {
    var childViews = this.get('childViews'), childView;

    this.didCreateElement() ;

    for (var i=0, l=childViews.get('length'); i<l; ++i) {
      childView = childViews[i];

      if (!childView) { continue; }
      childView._notifyDidCreateElement() ;
    }
  },

  /**
    Destroys any existing layer along with the layer for any child views as
    well.  If the view does not currently have a layer, then this method will
    do nothing.

    If you implement willDestroyLayer() on your view or if any mixins
    implement willDestroLayerMixin(), then this method will be invoked on your
    view before your layer is destroyed to give you a chance to clean up any
    event handlers, etc.

    If you write a willDestroyLayer() handler, you can assume that your
    didCreateLayer() handler was called earlier for the same layer.

    Normally you will not call or override this method yourself, but you may
    want to implement the above callbacks when it is run.

    @returns {SC.View} receiver
  */
  destroyElement: function() {
    var elem = this.get('element') ;
    if (elem) {
      // Notify the view and its child views that the element is about to be
      // destroyed.
      this._notifyWillDestroyElement() ;

      // Remove this DOM element from its parent.
      SC.$(elem).remove();
      this.set('element', null);
    }
    return this ;
  },

  /** @private
    If this view's element changes, we need to invalidate the caches of our
    child views so that we do not retain references to DOM elements that are no
    longer needed.

    @observes element
  */
  _sccv_elementDidChange: function() {
    var idx, len, childViews = this.get('childViews');

    len = childViews.get('length');
    for (idx = 0; idx < len; idx++) {
      childViews[idx].notifyPropertyChange('element');
    }
  }.observes('element'),

  willDestroyElement: function() { },

  /** @private -
    Invokes the `willDestroyElement` callback on the view and child views.
  */
  _notifyWillDestroyElement: function() {
    this.willDestroyElement();

    var len, idx, childViews = this.get('childViews') ;

    len = childViews.length ;
    for (idx=0; idx<len; ++idx) {
      childViews[idx]._notifyWillDestroyElement() ;
    }
  },

  parentViewDidChange: function() { },

  /**
    @private

    Renders to a context.
    Rendering only happens for the initial rendering. Further updates happen in updateLayer,
    and are not done to contexts, but to layers.
    Note: You should not generally override nor directly call this method. This method is only
    called by createLayer to set up the layer initially, and by renderChildViews, to write to
    a context.

    @param {SC.RenderContext} context the render context.
    @param {Boolean} firstTime Provided for compatibility when rendering legacy views only.
  */
  renderToContext: function(context, firstTime) {
    var hasLegacyRenderMethod, mixins, idx, len;

    this.beginPropertyChanges() ;
    this.set('layerNeedsUpdate', NO) ;

    if (SC.none(firstTime)) { firstTime = YES; }

    this._renderLayerSettings(context, firstTime);

    // If the render method takes two parameters, we assume that it is a
    // legacy implementation that takes context and firstTime. If it has only
    // one parameter, we assume it is the render delegates style that requires
    // only context. Note that, for backwards compatibility, the default
    // SC.View implementation of render uses the old style.
    hasLegacyRenderMethod = !this.update;

    // Let the render method handle rendering. If we have a render delegate
    // object set, it will be used there.
    if (hasLegacyRenderMethod) {
      this.render(context, firstTime);
    }
    // This view implements the render delegate protocol.
    else {
      if (firstTime) {
        this.render(context);
      } else {
        this.update(context.$());
      }
    }

    // If we've made it this far and renderChildViews() was never called,
    // render any child views now.
    if (firstTime && !this._didRenderChildViews) { this.renderChildViews(context, firstTime); }
    // Reset the flag so that if the layer is recreated we re-render the child views
    this._didRenderChildViews = NO;


    if (mixins = this.renderMixin) {
      len = mixins.length;
      for(idx=0; idx<len; ++idx) { mixins[idx].call(this, context, firstTime) ; }
    }

    this.endPropertyChanges() ;
  },

  _renderLayerSettings: function(context, firstTime) {
    context.resetClassNames();
    context.resetStyles();

    this.applyAttributesToContext(context);
  },

  applyAttributesToContext: function(context) {
    context.addClass(this.get('classNames'));

    if (this.get('isTextSelectable')) { context.addClass('allow-select'); }
    if (!this.get('isVisible')) { context.addClass('sc-hidden'); }
    if (this.get('isFirstResponder')) { context.addClass('focus'); }

    context.id(this.get('layerId'));
    context.attr('role', this.get('ariaRole'));
  },

  /**
  @private

    Invoked by createElement() and updateLayer() to actually render a context.
    This method calls the render() method on your view along with any
    renderMixin() methods supplied by mixins you might have added.

    You should not override this method directly. Nor should you call it. It is OLD.

    @param {SC.RenderContext} context the render context
    @param {Boolean} firstTime YES if this is creating a layer
    @returns {void}
  */
  prepareContext: function(context, firstTime) {
    // eventually, firstTime will be removed because it is ugly.
    // for now, we will sense whether we are doing things the ugly way or not.
    // if ugly, we will allow updates through.
    if (firstTime !== false) { firstTime = YES; } // the GOOD code path :)

    if (firstTime) {
      this.renderToContext(context);
    } else {
      this.updateLayer(context);
    }
  },

  /**
    Your render method should invoke this method to render any child views,
    especially if this is the first time the view will be rendered.  This will
    walk down the childView chain, rendering all of the children in a nested
    way.

    @param {SC.RenderContext} context the context
    @param {Boolean} firstName true if the layer is being created
    @returns {SC.RenderContext} the render context
    @test in render
  */
  renderChildViews: function(context, firstTime) {
    var cv = this.get('childViews'), len = cv.length, idx, view ;
    for (idx=0; idx<len; ++idx) {
      view = cv[idx] ;
      if (!view) { continue; }
      context = context.begin(view.get('tagName')) ;
      view.renderToContext(context, firstTime);
      context = context.end() ;
    }
    this._didRenderChildViews = YES;

    return context;
  },

  /** @private -
    override to add support for theming or in your view
  */
  render: function() { },

  /** @private -
    Invokes the receivers didAppendLayerToDocument() method if it exists and
    then invokes the same on all child views.
  */

  _notifyDidAppendToDocument: function() {
    if (!this.get('hasLayout')) { this.notifyPropertyChange('frame'); }
    if (this.didAppendToDocument) { this.didAppendToDocument(); }

    var i=0, child, childLen, children = this.get('childViews');
    for(i=0, childLen=children.length; i<childLen; i++) {
      child = children[i];
      if(child._notifyDidAppendToDocument){
        child._notifyDidAppendToDocument();
      }
    }
  },

  childViewsObserver: function(){
    var childViews = this.get('childViews'), i, iLen, child;
    for(i=0, iLen = childViews.length; i<iLen; i++){
      child = childViews[i];
      if(child._notifyDidAppendToDocument){
        child._notifyDidAppendToDocument();
      }
    }
  }.observes('childViews'),

  // ..........................................................
  // STANDARD RENDER PROPERTIES
  //

  /**
    Tag name for the view's outer element.  The tag name is only used when
    a layer is first created.  If you change the tagName for an element, you
    must destroy and recreate the view layer.

    @property {String}
  */
  tagName: 'div',

  /**
    The WAI-ARIA role of the control represented by this view. For example, a
    button may have a role of type 'button', or a pane may have a role of
    type 'alertdialog'. This property is used by assistive software to help
    visually challenged users navigate rich web applications.

    The full list of valid WAI-ARIA roles is available at:
    http://www.w3.org/TR/wai-aria/roles#roles_categorization

    @property {String}
  */
  ariaRole: null,

  /**
    Standard CSS class names to apply to the view's outer element.  This
    property automatically inherits any class names defined by the view's
    superclasses as well.

    @property {Array}
  */
  classNames: [],

  /**
    Tool tip property that will be set to the title attribute on the HTML
    rendered element.

    @property {String}
  */
  toolTip: null,

  /**
    The computed tooltip.  This is generated by localizing the toolTip
    property if necessary.

    @property {String}
  */
  displayToolTip: function() {
    var ret = this.get('toolTip');
    return (ret && this.get('localize')) ? SC.String.loc(ret) : (ret || '');
  }.property('toolTip','localize').cacheable(),

  /**
    Determines if the user can select text within the view.  Normally this is
    set to NO to disable text selection.  You should set this to YES if you
    are creating a view that includes editable text.  Otherwise, settings this
    to YES will probably make your controls harder to use and it is not
    recommended.

    @property {Boolean}
    @readOnly
  */
  isTextSelectable: NO,

  /**
    You can set this array to include any properties that should immediately
    invalidate the display.  The display will be automatically invalidated
    when one of these properties change.

    These are the properties that will be visible to any Render Delegate.
    When the RenderDelegate asks for a property it needs, the view checks the
    displayProperties array. It first looks for the property name prefixed
    by 'display'; for instance, if the render delegate needs a 'title',
    the view will attempt to find 'displayTitle'. If there is no 'displayTitle'
    in displayProperties, the view will then try 'title'. If 'title' is not
    in displayProperties either, an error will be thrown.

    This allows you to avoid collisions between your view's API and the Render
    Delegate's API.

    Implementation note:  'isVisible' is also effectively a display property,
    but it is not declared as such because the same effect is implemented
    inside _sc_isVisibleDidChange().  This avoids having two observers on
    'isVisible', which is:
      a.  More efficient
      b.  More correct, because we can guarantee the order of operations

    @property {Array}
    @readOnly
  */
  displayProperties: ['isFirstResponder'],

  // .......................................................
  // SC.RESPONDER SUPPORT
  //

  /** @property
    The nextResponder is usually the parentView.
  */
  nextResponder: function() {
    return this.get('parentView') ;
  }.property('parentView').cacheable(),


  /** @property
    Set to YES if your view is willing to accept first responder status.  This
    is used when calculcating key responder loop.
  */
  acceptsFirstResponder: NO,

  // .......................................................
  // CORE DISPLAY METHODS
  //

  /** @private
    Setup a view, but do not finish waking it up.
    - configure childViews
    - Determine the view's theme
    - Fetch a render delegate from the theme, if necessary
    - register the view with the global views hash, which is used for event
      dispatch
  */
  init: function() {
    var parentView = this.get('parentView'),
        path, root, lp, displayProperties ;

    sc_super();

    // Register the view for event handling. This hash is used by
    // SC.RootResponder to dispatch incoming events.
    SC.CoreView.views[this.get('layerId')] = this;

    // setup child views.  be sure to clone the child views array first
    this.childViews = this.get('childViews').slice() ;
    this.createChildViews() ; // setup child Views

    // register display property observers ..
    // TODO: Optimize into class setup
    displayProperties = this.get('displayProperties') ;
    for(var i=0, l=displayProperties.length; i<l; i++) {
      this.addObserver(displayProperties[i], this, this.displayDidChange);
    }
  },

  /**
    Wakes up the view. The default implementation immediately syncs any
    bindings, which may cause the view to need its display updated. You
    can override this method to perform any additional setup. Be sure to
    call sc_super to setup bindings and to call awake on childViews.

    It is best to awake a view before you add it to the DOM.  This way when
    the DOM is generated, it will have the correct initial values and will
    not require any additional setup.

    @returns {void}
  */
  awake: function() {
    sc_super();
    var childViews = this.get('childViews'), len = childViews.length, idx ;
    for (idx=0; idx<len; ++idx) {
      if (!childViews[idx]) { continue ; }
      childViews[idx].awake() ;
    }
  },

  /**
    Frame describes the current bounding rect for your view.  This is always
    measured from the top-left corner of the parent view.

    @property {Rect}
    @test in layoutStyle
  */
  frame: function() {
    return this.computeFrameWithParentFrame(null) ;
  }.property('useStaticLayout').cacheable(),    // We depend on the layout, but layoutDidChange will call viewDidResize to check the frame for us

  /**
    Computes the frame of the view by examining the view's DOM representation.
    If no representation exists, returns null.

    If the view has a parent view, the parent's bounds will be taken into account when
    calculating the frame.

    @returns {Rect} the computed frame
  */
  computeFrameWithParentFrame: function() {
    var layer,                            // The view's layer
        pv = this.get('parentView'),      // The view's parent view (if it exists)
        f;                                // The layer's coordinates in the document

    // need layer to be able to compute rect
    if (layer = this.get('element')) {
      f = SC.offset(layer); // x,y
      if (pv) { f = pv.convertFrameFromView(f, null); }

      /*
        TODO Can probably have some better width/height values - CC
        FIXME This will probably not work right with borders - PW
      */
      f.width = layer.offsetWidth;
      f.height = layer.offsetHeight;
      return f;
    }

    // Unable to compute yet
    if (this.get('hasLayout')) {
      return null;
    } else {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
  },

  /**
    The clipping frame returns the visible portion of the view, taking into
    account the clippingFrame of the parent view.  Keep in mind that
    the clippingFrame is in the context of the view itself, not it's parent
    view.

    Normally this will be calculated based on the intersection of your own
    clippingFrame and your parentView's clippingFrame.

    @property {Rect}
  */
  clippingFrame: function() {
    var f = this.get('frame'),
        ret = f,
        pv, cf;

    if (!f) return null;
    pv = this.get('parentView');
    if (pv) {
      cf = pv.get('clippingFrame');
      if (!cf) return f;
      ret = SC.intersectRects(cf, f);
    }
    ret.x -= f.x;
    ret.y -= f.y;

    return ret;
  }.property('parentView', 'frame').cacheable(),

  /** @private
    This method is invoked whenever the clippingFrame changes, notifying
    each child view that its clippingFrame has also changed.
  */
  _sc_view_clippingFrameDidChange: function() {
    var cvs = this.get('childViews'), len = cvs.length, idx, cv ;
    for (idx=0; idx<len; ++idx) {
      cv = cvs[idx] ;

      cv.notifyPropertyChange('clippingFrame') ;
      cv._sc_view_clippingFrameDidChange();
    }
  },

  /**
    Removes the child view from the parent view.

    @param {SC.View} view
    @returns {SC.View} receiver
  */
  removeChild: function(view) {
    // update parent node
    view.set('parentView', null) ;

    // remove view from childViews array.
    var childViews = this.get('childViews'),
        idx = childViews.indexOf(view) ;
    if (idx>=0) { childViews.removeAt(idx); }

    return this ;
  },

  /**
    Removes all children from the parentView.

    @returns {SC.View} receiver
  */
  removeAllChildren: function() {
    var childViews = this.get('childViews'), view ;
    while (view = childViews.objectAt(childViews.get('length')-1)) {
      this.removeChild(view) ;
    }
    return this ;
  },

  /**
    Removes the view from its parentView, if one is found.  Otherwise
    does nothing.

    @returns {SC.View} receiver
  */
  removeFromParent: function() {
    var parent = this.get('parentView') ;
    if (parent) { parent.removeChild(this) ; }
    return this ;
  },

  /**
    You must call this method on a view to destroy the view (and all of its
    child views). This will remove the view from any parent node, then make
    sure that the DOM element managed by the view can be released by the
    memory manager.
  */
  destroy: function() {
    if (this.get('isDestroyed')) { return this; } // nothing to do

    this._destroy(); // core destroy method

    // remove from parent if found
    if (this.get('parentView')) { this.removeFromParent(); }

    //Do generic destroy. It takes care of mixins and sets isDestroyed to YES.
    sc_super();
    return this; // done with cleanup
  },

  _destroy: function() {
    if (this.get('isDestroyed')) { return this ; } // nothing to do

    // destroy the layer -- this will avoid each child view destroying
    // the layer over and over again...
    this.destroyLayer() ;

    // first destroy any children.
    var childViews = this.get('childViews'), len = childViews.length, idx ;
    if (len) {
      childViews = childViews.slice() ;
      for (idx=0; idx<len; ++idx) { childViews[idx].destroy() ; }
    }

    // next remove view from global hash
    delete SC.CoreView.views[this.get('layerId')] ;
    delete this._CQ ;
    delete this.page ;

    return this ;
  },

  /**
    This method is called when your view is first created to setup any  child
    views that are already defined on your class.  If any are found, it will
    instantiate them for you.

    The default implementation of this method simply steps through your
    childViews array, which is expects to either be empty or to contain View
    designs that can be instantiated

    Alternatively, you can implement this method yourself in your own
    subclasses to look for views defined on specific properties and then build
     a childViews array yourself.

    Note that when you implement this method yourself, you should never
    instantiate views directly.  Instead, you should use
    this.createChildView() method instead.  This method can be much faster in
    a production environment than creating views yourself.

    @returns {SC.View} receiver
  */
  createChildViews: function() {
    var childViews = this.get('childViews'),
        len        = childViews.length,
        idx, key, views, view ;

    this.beginPropertyChanges() ;

    // swap the array
    for (idx=0; idx<len; ++idx) {
      if (key = (view = childViews[idx])) {

        // is this is a key name, lookup view class
        if (typeof key === SC.T_STRING) {
          view = this[key];
        } else {
          key = null ;
        }

        if (!view) {
          SC.Logger.error ("No view with name "+key+" has been found in "+this.toString());
          // skip this one.
          continue;
        }

        // createChildView creates the view if necessary, but also sets
        // important properties, such as parentView
        view = this.createChildView(view) ;
        if (key) { this[key] = view ; } // save on key name if passed
      }
      childViews[idx] = view;
    }

    this.endPropertyChanges() ;
    return this ;
  },

  /**
    Instantiates a view to be added to the childViews array during view
    initialization. You generally will not call this method directly unless
    you are overriding createChildViews(). Note that this method will
    automatically configure the correct settings on the new view instance to
    act as a child of the parent.

    @param {Class} viewClass
    @param {Hash} attrs optional attributes to add
    @returns {SC.View} new instance
    @test in createChildViews
  */
  createChildView: function(view, attrs) {
    if (!view.isClass) {
      attrs = view;
    } else {
      // attrs should always exist...
      if (!attrs) { attrs = {} ; }
      // clone the hash that was given so we dont pollute it if it's being reused
      else { attrs = SC.clone(attrs); }
    }

    attrs.owner = attrs.parentView = this ;
    if (!attrs.page) { attrs.page = this.page ; }

    // Now add this to the attributes and create.
    if (view.isClass) { view = view.create(attrs); }

    if (view.hasVisibility) {
      view.set('isVisibleInWindow', this.get('isVisibleInWindow'));
    }

    return view ;
  },

  /** walk like a duck */
  isView: YES,

  /**
    Default method called when a selectstart event is triggered. This event is
    only supported by IE. Used in sproutcore to disable text selection and
    IE8 accelerators. The accelerators will be enabled only in
    text selectable views. In FF and Safari we use the css style 'allow-select'.

    If you want to enable text selection in certain controls is recommended
    to override this function to always return YES , instead of setting
    isTextSelectable to true.

    For example in textfield you dont want to enable textSelection on the text
    hint only on the actual text you are entering. You can achieve that by
    only overriding this method.

    @param evt {SC.Event} the selectstart event
    @returns YES if selectable
  */
  selectStart: function(evt) {
    return this.get('isTextSelectable');
  },

  /**
    Used to block the contextMenu per view.

    @param evt {SC.Event} the contextmenu event
    @returns YES if the contextmenu can show up
  */
  contextMenu: function(evt) {
    if (this.get('isContextMenuEnabled')) { return YES; }
  }

});

SC.CoreView.mixin(/** @scope SC.View.prototype */ {

  /** @private walk like a duck -- used by SC.Page */
  isViewClass: YES,

  /**
    This method works just like extend() except that it will also preserve
    the passed attributes in case you want to use a view builder later, if
    needed.

    @param {Hash} attrs Attributes to add to view
    @returns {Class} SC.View subclass to create
    @function
  */
  design: function() {
    if (this.isDesign) {
      //@ if (debug)
      SC.Logger.warn("SC.View#design called twice for %@.".fmt(this));
      //@ endif
      return this;
    }

    var ret = this.extend.apply(this, arguments);
    ret.isDesign = YES ;
    if (SC.ViewDesigner) {
      SC.ViewDesigner.didLoadDesign(ret, this, SC.A(arguments));
    }
    return ret ;
  },

  extend: function() {
    var last = arguments[arguments.length - 1];

    if (last && !SC.none(last.theme)) {
      last.themeName = last.theme;
      delete last.theme;
    }

    return SC.Object.extend.apply(this, arguments);
  },

  /**
    Helper applies the layout to the prototype.
  */
  layout: function(layout) {
    this.prototype.layout = layout ;
    return this ;
  },

  /**
    Helper applies the classNames to the prototype
  */
  classNames: function(sc) {
    sc = (this.prototype.classNames || []).concat(sc);
    this.prototype.classNames = sc;
    return this ;
  },

  /**
    Help applies the tagName
  */
  tagName: function(tg) {
    this.prototype.tagName = tg;
    return this ;
  },

  /**
    Helper adds the childView
  */
  childView: function(cv) {
    var childViews = this.prototype.childViews || [];
    if (childViews === this.superclass.prototype.childViews) {
      childViews = childViews.slice();
    }
    childViews.push(cv) ;
    this.prototype.childViews = childViews;
    return this ;
  },

  /**
    Helper adds a binding to a design
  */
  bind: function(keyName, path) {
    var p = this.prototype, s = this.superclass.prototype;
    var bindings = p._bindings ;
    if (!bindings || bindings === s._bindings) {
      bindings = p._bindings = (bindings || []).slice() ;
    }

    keyName = keyName + "Binding";
    p[keyName] = path ;
    bindings.push(keyName);

    return this ;
  },

  /**
    Helper sets a generic property on a design.
  */
  prop: function(keyName, value) {
    this.prototype[keyName] = value;
    return this ;
  },

  /**
    Used to construct a localization for a view.  The default implementation
    will simply return the passed attributes.
  */
  localization: function(attrs, rootElement) {
    // add rootElement
    if (rootElement) attrs.rootElement = SC.$(rootElement)[0];
    return attrs;
  },

  /**
    Creates a view instance, first finding the DOM element you name and then
    using that as the root element.  You should not use this method very
    often, but it is sometimes useful if you want to attach to already
    existing HTML.

    @param {String|Element} element
    @param {Hash} attrs
    @returns {SC.View} instance
  */
  viewFor: function(element, attrs) {
    var args = SC.$A(arguments); // prepare to edit
    if (SC.none(element)) {
      args.shift(); // remove if no element passed
    } else args[0] = { rootElement: SC.$(element)[0] } ;
    var ret = this.create.apply(this, arguments) ;
    args = args[0] = null;
    return ret ;
  },

  /**
    Create a new view with the passed attributes hash.  If you have the
    Designer module loaded, this will also create a peer designer if needed.
  */
  create: function() {
    var last = arguments[arguments.length - 1];

    if (last && last.theme) {
      last.themeName = last.theme;
      delete last.theme;
    }

    var C=this, ret = new C(arguments);
    if (SC.ViewDesigner) {
      SC.ViewDesigner.didCreateView(ret, SC.$A(arguments));
    }
    return ret ;
  },

  /**
    Applies the passed localization hash to the component views.  Call this
    method before you call create().  Returns the receiver.  Typically you
    will do something like this:

    view = SC.View.design({...}).loc(localizationHash).create();

    @param {Hash} loc
    @param rootElement {String} optional rootElement with prepped HTML
    @returns {SC.View} receiver
  */
  loc: function(loc) {
    var childLocs = loc.childViews;
    delete loc.childViews; // clear out child views before applying to attrs

    this.applyLocalizedAttributes(loc) ;
    if (SC.ViewDesigner) {
      SC.ViewDesigner.didLoadLocalization(this, SC.$A(arguments));
    }

    // apply localization recursively to childViews
    var childViews = this.prototype.childViews, idx = childViews.length,
      viewClass;
    while(--idx>=0) {
      viewClass = childViews[idx];
      loc = childLocs[idx];
      if (loc && viewClass && typeof viewClass === SC.T_STRING) SC.String.loc(viewClass, loc);
    }

    return this; // done!
  },

  /**
    Internal method actually updates the localizated attributes on the view
    class.  This is overloaded in design mode to also save the attributes.
  */
  applyLocalizedAttributes: function(loc) {
    SC.mixin(this.prototype, loc) ;
  },

  views: {}

}) ;

SC.View = SC.CoreView.extend({});
