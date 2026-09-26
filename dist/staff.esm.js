var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
    if (decorator = decorators[i7])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp(target, key, result);
  return result;
};

// @lit-labs/ssr-dom-shim/lib/element-internals.js
var ElementInternalsShim = class ElementInternals {
  get shadowRoot() {
    return this.__host.__shadowRoot;
  }
  constructor(_host) {
    this.ariaActiveDescendantElement = null;
    this.ariaAtomic = "";
    this.ariaAutoComplete = "";
    this.ariaBrailleLabel = "";
    this.ariaBrailleRoleDescription = "";
    this.ariaBusy = "";
    this.ariaChecked = "";
    this.ariaColCount = "";
    this.ariaColIndex = "";
    this.ariaColIndexText = "";
    this.ariaColSpan = "";
    this.ariaControlsElements = null;
    this.ariaCurrent = "";
    this.ariaDescribedByElements = null;
    this.ariaDescription = "";
    this.ariaDetailsElements = null;
    this.ariaDisabled = "";
    this.ariaErrorMessageElements = null;
    this.ariaExpanded = "";
    this.ariaFlowToElements = null;
    this.ariaHasPopup = "";
    this.ariaHidden = "";
    this.ariaInvalid = "";
    this.ariaKeyShortcuts = "";
    this.ariaLabel = "";
    this.ariaLabelledByElements = null;
    this.ariaLevel = "";
    this.ariaLive = "";
    this.ariaModal = "";
    this.ariaMultiLine = "";
    this.ariaMultiSelectable = "";
    this.ariaOrientation = "";
    this.ariaOwnsElements = null;
    this.ariaPlaceholder = "";
    this.ariaPosInSet = "";
    this.ariaPressed = "";
    this.ariaReadOnly = "";
    this.ariaRelevant = "";
    this.ariaRequired = "";
    this.ariaRoleDescription = "";
    this.ariaRowCount = "";
    this.ariaRowIndex = "";
    this.ariaRowIndexText = "";
    this.ariaRowSpan = "";
    this.ariaSelected = "";
    this.ariaSetSize = "";
    this.ariaSort = "";
    this.ariaValueMax = "";
    this.ariaValueMin = "";
    this.ariaValueNow = "";
    this.ariaValueText = "";
    this.role = "";
    this.form = null;
    this.labels = [];
    this.states = /* @__PURE__ */ new Set();
    this.validationMessage = "";
    this.validity = {};
    this.willValidate = true;
    this.__host = _host;
  }
  checkValidity() {
    console.warn("`ElementInternals.checkValidity()` was called on the server.This method always returns true.");
    return true;
  }
  reportValidity() {
    return true;
  }
  setFormValue() {
  }
  setValidity() {
  }
};

// @lit-labs/ssr-dom-shim/lib/events.js
var __classPrivateFieldSet = function(receiver, state, value, kind, f3) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f3) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f3 : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f3.call(receiver, value) : f3 ? f3.value = value : state.set(receiver, value), value;
};
var __classPrivateFieldGet = function(receiver, state, kind, f3) {
  if (kind === "a" && !f3) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f3 : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f3 : kind === "a" ? f3.call(receiver) : f3 ? f3.value : state.get(receiver);
};
var _Event_cancelable;
var _Event_bubbles;
var _Event_composed;
var _Event_defaultPrevented;
var _Event_timestamp;
var _Event_propagationStopped;
var _Event_type;
var _Event_target;
var _Event_isBeingDispatched;
var _a;
var _CustomEvent_detail;
var _b;
var NONE = 0;
var CAPTURING_PHASE = 1;
var AT_TARGET = 2;
var BUBBLING_PHASE = 3;
var enumerableProperty = { __proto__: null };
enumerableProperty.enumerable = true;
Object.freeze(enumerableProperty);
var EventShim = (_a = class Event {
  constructor(type, options = {}) {
    _Event_cancelable.set(this, false);
    _Event_bubbles.set(this, false);
    _Event_composed.set(this, false);
    _Event_defaultPrevented.set(this, false);
    _Event_timestamp.set(this, Date.now());
    _Event_propagationStopped.set(this, false);
    _Event_type.set(this, void 0);
    _Event_target.set(this, void 0);
    _Event_isBeingDispatched.set(this, void 0);
    this.NONE = NONE;
    this.CAPTURING_PHASE = CAPTURING_PHASE;
    this.AT_TARGET = AT_TARGET;
    this.BUBBLING_PHASE = BUBBLING_PHASE;
    if (arguments.length === 0)
      throw new Error(`The type argument must be specified`);
    if (typeof options !== "object" || !options) {
      throw new Error(`The "options" argument must be an object`);
    }
    const { bubbles, cancelable, composed } = options;
    __classPrivateFieldSet(this, _Event_cancelable, !!cancelable, "f");
    __classPrivateFieldSet(this, _Event_bubbles, !!bubbles, "f");
    __classPrivateFieldSet(this, _Event_composed, !!composed, "f");
    __classPrivateFieldSet(this, _Event_type, `${type}`, "f");
    __classPrivateFieldSet(this, _Event_target, null, "f");
    __classPrivateFieldSet(this, _Event_isBeingDispatched, false, "f");
  }
  initEvent(_type, _bubbles, _cancelable) {
    throw new Error("Method not implemented.");
  }
  stopImmediatePropagation() {
    this.stopPropagation();
  }
  preventDefault() {
    __classPrivateFieldSet(this, _Event_defaultPrevented, true, "f");
  }
  get target() {
    return __classPrivateFieldGet(this, _Event_target, "f");
  }
  get currentTarget() {
    return __classPrivateFieldGet(this, _Event_target, "f");
  }
  get srcElement() {
    return __classPrivateFieldGet(this, _Event_target, "f");
  }
  get type() {
    return __classPrivateFieldGet(this, _Event_type, "f");
  }
  get cancelable() {
    return __classPrivateFieldGet(this, _Event_cancelable, "f");
  }
  get defaultPrevented() {
    return __classPrivateFieldGet(this, _Event_cancelable, "f") && __classPrivateFieldGet(this, _Event_defaultPrevented, "f");
  }
  get timeStamp() {
    return __classPrivateFieldGet(this, _Event_timestamp, "f");
  }
  composedPath() {
    return __classPrivateFieldGet(this, _Event_isBeingDispatched, "f") ? [__classPrivateFieldGet(this, _Event_target, "f")] : [];
  }
  get returnValue() {
    return !__classPrivateFieldGet(this, _Event_cancelable, "f") || !__classPrivateFieldGet(this, _Event_defaultPrevented, "f");
  }
  get bubbles() {
    return __classPrivateFieldGet(this, _Event_bubbles, "f");
  }
  get composed() {
    return __classPrivateFieldGet(this, _Event_composed, "f");
  }
  get eventPhase() {
    return __classPrivateFieldGet(this, _Event_isBeingDispatched, "f") ? _a.AT_TARGET : _a.NONE;
  }
  get cancelBubble() {
    return __classPrivateFieldGet(this, _Event_propagationStopped, "f");
  }
  set cancelBubble(value) {
    if (value) {
      __classPrivateFieldSet(this, _Event_propagationStopped, true, "f");
    }
  }
  stopPropagation() {
    __classPrivateFieldSet(this, _Event_propagationStopped, true, "f");
  }
  get isTrusted() {
    return false;
  }
}, _Event_cancelable = /* @__PURE__ */ new WeakMap(), _Event_bubbles = /* @__PURE__ */ new WeakMap(), _Event_composed = /* @__PURE__ */ new WeakMap(), _Event_defaultPrevented = /* @__PURE__ */ new WeakMap(), _Event_timestamp = /* @__PURE__ */ new WeakMap(), _Event_propagationStopped = /* @__PURE__ */ new WeakMap(), _Event_type = /* @__PURE__ */ new WeakMap(), _Event_target = /* @__PURE__ */ new WeakMap(), _Event_isBeingDispatched = /* @__PURE__ */ new WeakMap(), _a.NONE = NONE, _a.CAPTURING_PHASE = CAPTURING_PHASE, _a.AT_TARGET = AT_TARGET, _a.BUBBLING_PHASE = BUBBLING_PHASE, _a);
Object.defineProperties(EventShim.prototype, {
  initEvent: enumerableProperty,
  stopImmediatePropagation: enumerableProperty,
  preventDefault: enumerableProperty,
  target: enumerableProperty,
  currentTarget: enumerableProperty,
  srcElement: enumerableProperty,
  type: enumerableProperty,
  cancelable: enumerableProperty,
  defaultPrevented: enumerableProperty,
  timeStamp: enumerableProperty,
  composedPath: enumerableProperty,
  returnValue: enumerableProperty,
  bubbles: enumerableProperty,
  composed: enumerableProperty,
  eventPhase: enumerableProperty,
  cancelBubble: enumerableProperty,
  stopPropagation: enumerableProperty,
  isTrusted: enumerableProperty
});
var CustomEventShim = (_b = class CustomEvent2 extends EventShim {
  constructor(type, options = {}) {
    super(type, options);
    _CustomEvent_detail.set(this, void 0);
    __classPrivateFieldSet(this, _CustomEvent_detail, options?.detail ?? null, "f");
  }
  initCustomEvent(_type, _bubbles, _cancelable, _detail) {
    throw new Error("Method not implemented.");
  }
  get detail() {
    return __classPrivateFieldGet(this, _CustomEvent_detail, "f");
  }
}, _CustomEvent_detail = /* @__PURE__ */ new WeakMap(), _b);
Object.defineProperties(CustomEventShim.prototype, {
  detail: enumerableProperty
});
var EventShimWithRealType = EventShim;
var CustomEventShimWithRealType = CustomEventShim;

// @lit-labs/ssr-dom-shim/lib/css.js
var _a2;
var CSSRuleShim = (_a2 = class CSSRule {
  constructor() {
    this.STYLE_RULE = 1;
    this.CHARSET_RULE = 2;
    this.IMPORT_RULE = 3;
    this.MEDIA_RULE = 4;
    this.FONT_FACE_RULE = 5;
    this.PAGE_RULE = 6;
    this.NAMESPACE_RULE = 10;
    this.KEYFRAMES_RULE = 7;
    this.KEYFRAME_RULE = 8;
    this.SUPPORTS_RULE = 12;
    this.COUNTER_STYLE_RULE = 11;
    this.FONT_FEATURE_VALUES_RULE = 14;
    this.MARGIN_RULE = 9;
    this.__parentStyleSheet = null;
    this.cssText = "";
  }
  get parentRule() {
    return null;
  }
  get parentStyleSheet() {
    return this.__parentStyleSheet;
  }
  get type() {
    return 0;
  }
}, _a2.STYLE_RULE = 1, _a2.CHARSET_RULE = 2, _a2.IMPORT_RULE = 3, _a2.MEDIA_RULE = 4, _a2.FONT_FACE_RULE = 5, _a2.PAGE_RULE = 6, _a2.NAMESPACE_RULE = 10, _a2.KEYFRAMES_RULE = 7, _a2.KEYFRAME_RULE = 8, _a2.SUPPORTS_RULE = 12, _a2.COUNTER_STYLE_RULE = 11, _a2.FONT_FEATURE_VALUES_RULE = 14, _a2.MARGIN_RULE = 9, _a2);

// @lit-labs/ssr-dom-shim/index.js
globalThis.Event ??= EventShimWithRealType;
globalThis.CustomEvent ??= CustomEventShimWithRealType;
var constructionToken = Symbol();
var isCaptureEventListener = (options) => typeof options === "boolean" ? options : options?.capture ?? false;
var enumerableProperty2 = { __proto__: null };
enumerableProperty2.enumerable = true;
Object.freeze(enumerableProperty2);
var EventTarget = class {
  constructor() {
    this.__eventListeners = /* @__PURE__ */ new Map();
    this.__captureEventListeners = /* @__PURE__ */ new Map();
  }
  addEventListener(type, callback, options) {
    if (callback === void 0 || callback === null) {
      return;
    }
    const eventListenersMap = isCaptureEventListener(options) ? this.__captureEventListeners : this.__eventListeners;
    let eventListeners = eventListenersMap.get(type);
    if (eventListeners === void 0) {
      eventListeners = /* @__PURE__ */ new Map();
      eventListenersMap.set(type, eventListeners);
    } else if (eventListeners.has(callback)) {
      return;
    }
    const normalizedOptions = typeof options === "object" && options ? options : {};
    normalizedOptions.signal?.addEventListener("abort", () => this.removeEventListener(type, callback, options));
    eventListeners.set(callback, normalizedOptions ?? {});
  }
  removeEventListener(type, callback, options) {
    if (callback === void 0 || callback === null) {
      return;
    }
    const eventListenersMap = isCaptureEventListener(options) ? this.__captureEventListeners : this.__eventListeners;
    const eventListeners = eventListenersMap.get(type);
    if (eventListeners !== void 0) {
      eventListeners.delete(callback);
      if (!eventListeners.size) {
        eventListenersMap.delete(type);
      }
    }
  }
  dispatchEvent(event) {
    let composedPath = this.__resolveFullEventPath();
    if (!event.composed && this.__host) {
      composedPath = composedPath.slice(0, composedPath.indexOf(this.__host));
    }
    let stopPropagation = false;
    let stopImmediatePropagation = false;
    let eventPhase = EventShimWithRealType.NONE;
    let target = null;
    let tmpTarget = null;
    let currentTarget = null;
    const originalStopPropagation = event.stopPropagation;
    const originalStopImmediatePropagation = event.stopImmediatePropagation;
    Object.defineProperties(event, {
      target: {
        get() {
          return target ?? tmpTarget;
        },
        ...enumerableProperty2
      },
      srcElement: {
        get() {
          return event.target;
        },
        ...enumerableProperty2
      },
      currentTarget: {
        get() {
          return currentTarget;
        },
        ...enumerableProperty2
      },
      eventPhase: {
        get() {
          return eventPhase;
        },
        ...enumerableProperty2
      },
      composedPath: {
        value: () => composedPath,
        ...enumerableProperty2
      },
      stopPropagation: {
        value: () => {
          stopPropagation = true;
          originalStopPropagation.call(event);
        },
        ...enumerableProperty2
      },
      stopImmediatePropagation: {
        value: () => {
          stopImmediatePropagation = true;
          originalStopImmediatePropagation.call(event);
        },
        ...enumerableProperty2
      }
    });
    const invokeEventListener = (listener, options, eventListenerMap) => {
      if (typeof listener === "function") {
        listener(event);
      } else if (typeof listener?.handleEvent === "function") {
        listener.handleEvent(event);
      }
      if (options.once) {
        eventListenerMap.delete(listener);
      }
    };
    const finishDispatch = () => {
      currentTarget = null;
      eventPhase = EventShimWithRealType.NONE;
      return !event.defaultPrevented;
    };
    const captureEventPath = composedPath.slice().reverse();
    target = !this.__host || !event.composed ? this : null;
    const retarget = (eventTargets) => {
      tmpTarget = this;
      while (tmpTarget.__host && eventTargets.includes(tmpTarget.__host)) {
        tmpTarget = tmpTarget.__host;
      }
    };
    for (const eventTarget of captureEventPath) {
      if (!target && (!tmpTarget || tmpTarget === eventTarget.__host)) {
        retarget(captureEventPath.slice(captureEventPath.indexOf(eventTarget)));
      }
      currentTarget = eventTarget;
      eventPhase = eventTarget === event.target ? EventShimWithRealType.AT_TARGET : EventShimWithRealType.CAPTURING_PHASE;
      const captureEventListeners = eventTarget.__captureEventListeners.get(event.type);
      if (captureEventListeners) {
        for (const [listener, options] of captureEventListeners) {
          invokeEventListener(listener, options, captureEventListeners);
          if (stopImmediatePropagation) {
            return finishDispatch();
          }
        }
      }
      if (stopPropagation) {
        return finishDispatch();
      }
    }
    const bubbleEventPath = event.bubbles ? composedPath : [this];
    tmpTarget = null;
    for (const eventTarget of bubbleEventPath) {
      if (!target && (!tmpTarget || eventTarget === tmpTarget.__host)) {
        retarget(bubbleEventPath.slice(0, bubbleEventPath.indexOf(eventTarget) + 1));
      }
      currentTarget = eventTarget;
      eventPhase = eventTarget === event.target ? EventShimWithRealType.AT_TARGET : EventShimWithRealType.BUBBLING_PHASE;
      const eventListeners = eventTarget.__eventListeners.get(event.type);
      if (eventListeners) {
        for (const [listener, options] of eventListeners) {
          invokeEventListener(listener, options, eventListeners);
          if (stopImmediatePropagation) {
            return finishDispatch();
          }
        }
      }
      if (stopPropagation) {
        return finishDispatch();
      }
    }
    return finishDispatch();
  }
  __resolveFullEventPath() {
    if (this.__eventPathCache) {
      return this.__eventPathCache;
    } else if (!this.__eventTargetParent) {
      return this.__eventPathCache = [this, documentShim, windowShim];
    } else {
      return this.__eventPathCache = [
        this,
        ...this.__eventTargetParent.__resolveFullEventPath()
      ];
    }
  }
};
var attributes = /* @__PURE__ */ new WeakMap();
var attributesForElement = (element) => {
  let attrs = attributes.get(element);
  if (attrs === void 0) {
    attributes.set(element, attrs = /* @__PURE__ */ new Map());
  }
  return attrs;
};
var NodeShim = class Node2 extends EventTarget {
  getRootNode(options) {
    if (options?.composed) {
      return document2;
    }
    const host = this.__host;
    return host?.__shadowRoot ?? document2;
  }
};
var DocumentShim = class Document2 extends NodeShim {
  get adoptedStyleSheets() {
    return [];
  }
  createTreeWalker() {
    return {};
  }
  createTextNode() {
    return {};
  }
  createElement() {
    return {};
  }
};
var documentShim = new DocumentShim();
var document2 = documentShim;
var WindowShim = class Window extends NodeShim {
  constructor(token) {
    super();
    if (token !== constructionToken) {
      throw new TypeError("Illegal constructor");
    }
    Object.assign(this, globalThis, {
      CustomElementRegistry,
      customElements: customElements2,
      document: document2,
      Document: DocumentShim,
      Element: ElementShim,
      EventTarget,
      HTMLElement: HTMLElementShim,
      Node: NodeShim,
      ShadowRoot: ShadowRootShim,
      window: this,
      Window: WindowShim
    });
  }
};
var ElementShim = class Element extends NodeShim {
  constructor() {
    super(...arguments);
    this.__shadowRootMode = null;
    this.__shadowRoot = null;
    this.__internals = null;
  }
  get attributes() {
    return Array.from(attributesForElement(this)).map(([name, value]) => ({
      name,
      value
    }));
  }
  get shadowRoot() {
    if (this.__shadowRootMode === "closed") {
      return null;
    }
    return this.__shadowRoot;
  }
  get localName() {
    return this.constructor.__localName;
  }
  get tagName() {
    return this.localName?.toUpperCase();
  }
  setAttribute(name, value) {
    attributesForElement(this).set(name, String(value));
  }
  removeAttribute(name) {
    attributesForElement(this).delete(name);
  }
  toggleAttribute(name, force) {
    if (this.hasAttribute(name)) {
      if (force === void 0 || !force) {
        this.removeAttribute(name);
        return false;
      }
    } else {
      if (force === void 0 || force) {
        this.setAttribute(name, "");
        return true;
      } else {
        return false;
      }
    }
    return true;
  }
  hasAttribute(name) {
    return attributesForElement(this).has(name);
  }
  attachShadow(init) {
    this.__shadowRootMode = init.mode;
    const shadowRoot = new ShadowRootShim(constructionToken, init);
    shadowRoot.__eventTargetParent = this;
    shadowRoot.__host = this;
    return this.__shadowRoot = shadowRoot;
  }
  attachInternals() {
    if (this.__internals !== null) {
      throw new Error(`Failed to execute 'attachInternals' on 'HTMLElement': ElementInternals for the specified element was already attached.`);
    }
    const internals = new ElementInternalsShim(this);
    this.__internals = internals;
    return internals;
  }
  getAttribute(name) {
    const value = attributesForElement(this).get(name);
    return value ?? null;
  }
};
var HTMLElementShim = class HTMLElement2 extends ElementShim {
};
var HTMLElementShimWithRealType = HTMLElementShim;
var ShadowRootShim = class ShadowRoot extends NodeShim {
  get host() {
    return this.__host;
  }
  constructor(constructionToken2, init) {
    super();
    if (constructionToken2 !== constructionToken2) {
      throw new TypeError("Illegal constructor");
    }
    this.mode = init.mode;
  }
};
globalThis.litServerRoot ??= Object.defineProperty(new HTMLElementShimWithRealType(), "localName", {
  // Patch localName (and tagName) to return a unique name.
  get() {
    return "lit-server-root";
  }
});
function promiseWithResolvers() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
var CustomElementRegistry = class {
  constructor() {
    this.__definitions = /* @__PURE__ */ new Map();
    this.__reverseDefinitions = /* @__PURE__ */ new Map();
    this.__pendingWhenDefineds = /* @__PURE__ */ new Map();
  }
  define(name, ctor) {
    if (this.__definitions.has(name)) {
      if (true) {
        console.warn(`'CustomElementRegistry' already has "${name}" defined. This may have been caused by live reload or hot module replacement in which case it can be safely ignored.
Make sure to test your application with a production build as repeat registrations will throw in production.`);
      } else {
        throw new Error(`Failed to execute 'define' on 'CustomElementRegistry': the name "${name}" has already been used with this registry`);
      }
    }
    if (this.__reverseDefinitions.has(ctor)) {
      throw new Error(`Failed to execute 'define' on 'CustomElementRegistry': the constructor has already been used with this registry for the tag name ${this.__reverseDefinitions.get(ctor)}`);
    }
    ctor.__localName = name;
    this.__definitions.set(name, {
      ctor,
      // Note it's important we read `observedAttributes` in case it is a getter
      // with side-effects, as is the case in Lit, where it triggers class
      // finalization.
      //
      // TODO(aomarks) To be spec compliant, we should also capture the
      // registration-time lifecycle methods like `connectedCallback`. For them
      // to be actually accessible to e.g. the Lit SSR element renderer, though,
      // we'd need to introduce a new API for accessing them (since `get` only
      // returns the constructor).
      observedAttributes: ctor.observedAttributes ?? []
    });
    this.__reverseDefinitions.set(ctor, name);
    this.__pendingWhenDefineds.get(name)?.resolve(ctor);
    this.__pendingWhenDefineds.delete(name);
  }
  get(name) {
    const definition = this.__definitions.get(name);
    return definition?.ctor;
  }
  getName(ctor) {
    return this.__reverseDefinitions.get(ctor) ?? null;
  }
  initialize(_root) {
    throw new Error(`customElements.initialize is not currently supported in SSR. Please file a bug if you need it.`);
  }
  upgrade(_element) {
    throw new Error(`customElements.upgrade is not currently supported in SSR. Please file a bug if you need it.`);
  }
  async whenDefined(name) {
    const definition = this.__definitions.get(name);
    if (definition) {
      return definition.ctor;
    }
    let withResolvers = this.__pendingWhenDefineds.get(name);
    if (!withResolvers) {
      withResolvers = promiseWithResolvers();
      this.__pendingWhenDefineds.set(name, withResolvers);
    }
    return withResolvers.promise;
  }
};
var CustomElementRegistryShimWithRealType = CustomElementRegistry;
var customElements2 = new CustomElementRegistryShimWithRealType();
var windowShim = new WindowShim(constructionToken);

// @lit/reactive-element/node/css-tag.js
var t = globalThis;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t5, e5, o7) {
    if (this._$cssResult$ = true, o7 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t5, this.t = e5;
  }
  get styleSheet() {
    let t5 = this.o;
    const s5 = this.t;
    if (e && void 0 === t5) {
      const e5 = void 0 !== s5 && 1 === s5.length;
      e5 && (t5 = o.get(s5)), void 0 === t5 && ((this.o = t5 = new CSSStyleSheet()).replaceSync(this.cssText), e5 && o.set(s5, t5));
    }
    return t5;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t5) => new n("string" == typeof t5 ? t5 : t5 + "", void 0, s);
var i = (t5, ...e5) => {
  const o7 = 1 === t5.length ? t5[0] : e5.reduce((e6, s5, o8) => e6 + ((t6) => {
    if (true === t6._$cssResult$) return t6.cssText;
    if ("number" == typeof t6) return t6;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t6 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s5) + t5[o8 + 1], t5[0]);
  return new n(o7, t5, s);
};
var S = (s5, o7) => {
  if (e) s5.adoptedStyleSheets = o7.map((t5) => t5 instanceof CSSStyleSheet ? t5 : t5.styleSheet);
  else for (const e5 of o7) {
    const o8 = document.createElement("style"), n6 = t.litNonce;
    void 0 !== n6 && o8.setAttribute("nonce", n6), o8.textContent = e5.cssText, s5.appendChild(o8);
  }
};
var c = e || void 0 === t.CSSStyleSheet ? (t5) => t5 : (t5) => t5 instanceof CSSStyleSheet ? ((t6) => {
  let e5 = "";
  for (const s5 of t6.cssRules) e5 += s5.cssText;
  return r(e5);
})(t5) : t5;

// @lit/reactive-element/node/reactive-element.js
var { is: h, defineProperty: r2, getOwnPropertyDescriptor: o2, getOwnPropertyNames: n2, getOwnPropertySymbols: a, getPrototypeOf: c2 } = Object;
var l = globalThis;
l.customElements ??= customElements2;
var p = l.trustedTypes;
var d = p ? p.emptyScript : "";
var u = l.reactiveElementPolyfillSupport;
var f = (t5, s5) => t5;
var b = { toAttribute(t5, s5) {
  switch (s5) {
    case Boolean:
      t5 = t5 ? d : null;
      break;
    case Object:
    case Array:
      t5 = null == t5 ? t5 : JSON.stringify(t5);
  }
  return t5;
}, fromAttribute(t5, s5) {
  let i7 = t5;
  switch (s5) {
    case Boolean:
      i7 = null !== t5;
      break;
    case Number:
      i7 = null === t5 ? null : Number(t5);
      break;
    case Object:
    case Array:
      try {
        i7 = JSON.parse(t5);
      } catch (t6) {
        i7 = null;
      }
  }
  return i7;
} };
var m = (t5, s5) => !h(t5, s5);
var y = { attribute: true, type: String, converter: b, reflect: false, useDefault: false, hasChanged: m };
Symbol.metadata ??= Symbol("metadata"), l.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var g = class extends (globalThis.HTMLElement ?? HTMLElementShimWithRealType) {
  static addInitializer(t5) {
    this._$Ei(), (this.l ??= []).push(t5);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t5, s5 = y) {
    if (s5.state && (s5.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t5) && ((s5 = Object.create(s5)).wrapped = true), this.elementProperties.set(t5, s5), !s5.noAccessor) {
      const i7 = Symbol(), e5 = this.getPropertyDescriptor(t5, i7, s5);
      void 0 !== e5 && r2(this.prototype, t5, e5);
    }
  }
  static getPropertyDescriptor(t5, s5, i7) {
    const { get: e5, set: h4 } = o2(this.prototype, t5) ?? { get() {
      return this[s5];
    }, set(t6) {
      this[s5] = t6;
    } };
    return { get: e5, set(s6) {
      const r6 = e5?.call(this);
      h4?.call(this, s6), this.requestUpdate(t5, r6, i7);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t5) {
    return this.elementProperties.get(t5) ?? y;
  }
  static _$Ei() {
    if (this.hasOwnProperty(f("elementProperties"))) return;
    const t5 = c2(this);
    t5.finalize(), void 0 !== t5.l && (this.l = [...t5.l]), this.elementProperties = new Map(t5.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(f("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(f("properties"))) {
      const t6 = this.properties, s5 = [...n2(t6), ...a(t6)];
      for (const i7 of s5) this.createProperty(i7, t6[i7]);
    }
    const t5 = this[Symbol.metadata];
    if (null !== t5) {
      const s5 = litPropertyMetadata.get(t5);
      if (void 0 !== s5) for (const [t6, i7] of s5) this.elementProperties.set(t6, i7);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t6, s5] of this.elementProperties) {
      const i7 = this._$Eu(t6, s5);
      void 0 !== i7 && this._$Eh.set(i7, t6);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(t5) {
    const s5 = [];
    if (Array.isArray(t5)) {
      const e5 = new Set(t5.flat(1 / 0).reverse());
      for (const t6 of e5) s5.unshift(c(t6));
    } else void 0 !== t5 && s5.push(c(t5));
    return s5;
  }
  static _$Eu(t5, s5) {
    const i7 = s5.attribute;
    return false === i7 ? void 0 : "string" == typeof i7 ? i7 : "string" == typeof t5 ? t5.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t5) => this.enableUpdating = t5), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t5) => t5(this));
  }
  addController(t5) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t5), void 0 !== this.renderRoot && this.isConnected && t5.hostConnected?.();
  }
  removeController(t5) {
    this._$EO?.delete(t5);
  }
  _$E_() {
    const t5 = /* @__PURE__ */ new Map(), s5 = this.constructor.elementProperties;
    for (const i7 of s5.keys()) this.hasOwnProperty(i7) && (t5.set(i7, this[i7]), delete this[i7]);
    t5.size > 0 && (this._$Ep = t5);
  }
  createRenderRoot() {
    const t5 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S(t5, this.constructor.elementStyles), t5;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t5) => t5.hostConnected?.());
  }
  enableUpdating(t5) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t5) => t5.hostDisconnected?.());
  }
  attributeChangedCallback(t5, s5, i7) {
    this._$AK(t5, i7);
  }
  _$ET(t5, s5) {
    const i7 = this.constructor.elementProperties.get(t5), e5 = this.constructor._$Eu(t5, i7);
    if (void 0 !== e5 && true === i7.reflect) {
      const h4 = (void 0 !== i7.converter?.toAttribute ? i7.converter : b).toAttribute(s5, i7.type);
      this._$Em = t5, null == h4 ? this.removeAttribute(e5) : this.setAttribute(e5, h4), this._$Em = null;
    }
  }
  _$AK(t5, s5) {
    const i7 = this.constructor, e5 = i7._$Eh.get(t5);
    if (void 0 !== e5 && this._$Em !== e5) {
      const t6 = i7.getPropertyOptions(e5), h4 = "function" == typeof t6.converter ? { fromAttribute: t6.converter } : void 0 !== t6.converter?.fromAttribute ? t6.converter : b;
      this._$Em = e5;
      const r6 = h4.fromAttribute(s5, t6.type);
      this[e5] = r6 ?? this._$Ej?.get(e5) ?? r6, this._$Em = null;
    }
  }
  requestUpdate(t5, s5, i7, e5 = false, h4) {
    if (void 0 !== t5) {
      const r6 = this.constructor;
      if (false === e5 && (h4 = this[t5]), i7 ??= r6.getPropertyOptions(t5), !((i7.hasChanged ?? m)(h4, s5) || i7.useDefault && i7.reflect && h4 === this._$Ej?.get(t5) && !this.hasAttribute(r6._$Eu(t5, i7)))) return;
      this.C(t5, s5, i7);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t5, s5, { useDefault: i7, reflect: e5, wrapped: h4 }, r6) {
    i7 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t5) && (this._$Ej.set(t5, r6 ?? s5 ?? this[t5]), true !== h4 || void 0 !== r6) || (this._$AL.has(t5) || (this.hasUpdated || i7 || (s5 = void 0), this._$AL.set(t5, s5)), true === e5 && this._$Em !== t5 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t5));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t6) {
      Promise.reject(t6);
    }
    const t5 = this.scheduleUpdate();
    return null != t5 && await t5, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t7, s6] of this._$Ep) this[t7] = s6;
        this._$Ep = void 0;
      }
      const t6 = this.constructor.elementProperties;
      if (t6.size > 0) for (const [s6, i7] of t6) {
        const { wrapped: t7 } = i7, e5 = this[s6];
        true !== t7 || this._$AL.has(s6) || void 0 === e5 || this.C(s6, void 0, i7, e5);
      }
    }
    let t5 = false;
    const s5 = this._$AL;
    try {
      t5 = this.shouldUpdate(s5), t5 ? (this.willUpdate(s5), this._$EO?.forEach((t6) => t6.hostUpdate?.()), this.update(s5)) : this._$EM();
    } catch (s6) {
      throw t5 = false, this._$EM(), s6;
    }
    t5 && this._$AE(s5);
  }
  willUpdate(t5) {
  }
  _$AE(t5) {
    this._$EO?.forEach((t6) => t6.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t5)), this.updated(t5);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t5) {
    return true;
  }
  update(t5) {
    this._$Eq &&= this._$Eq.forEach((t6) => this._$ET(t6, this[t6])), this._$EM();
  }
  updated(t5) {
  }
  firstUpdated(t5) {
  }
};
g.elementStyles = [], g.shadowRootOptions = { mode: "open" }, g[f("elementProperties")] = /* @__PURE__ */ new Map(), g[f("finalized")] = /* @__PURE__ */ new Map(), u?.({ ReactiveElement: g }), (l.reactiveElementVersions ??= []).push("2.1.2");

// lit-html/lit-html.js
var t2 = globalThis;
var i2 = (t5) => t5;
var s2 = t2.trustedTypes;
var e2 = s2 ? s2.createPolicy("lit-html", { createHTML: (t5) => t5 }) : void 0;
var h2 = "$lit$";
var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var n3 = "?" + o3;
var r3 = `<${n3}>`;
var l2 = document;
var c3 = () => l2.createComment("");
var a2 = (t5) => null === t5 || "object" != typeof t5 && "function" != typeof t5;
var u2 = Array.isArray;
var d2 = (t5) => u2(t5) || "function" == typeof t5?.[Symbol.iterator];
var f2 = "[ 	\n\f\r]";
var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m2 = />/g;
var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g2 = /'/g;
var $ = /"/g;
var y2 = /^(?:script|style|textarea|title)$/i;
var x = (t5) => (i7, ...s5) => ({ _$litType$: t5, strings: i7, values: s5 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = Symbol.for("lit-noChange");
var A = Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t5, i7) {
  if (!u2(t5) || !t5.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e2 ? e2.createHTML(i7) : i7;
}
var N = (t5, i7) => {
  const s5 = t5.length - 1, e5 = [];
  let n6, l3 = 2 === i7 ? "<svg>" : 3 === i7 ? "<math>" : "", c5 = v;
  for (let i8 = 0; i8 < s5; i8++) {
    const s6 = t5[i8];
    let a3, u5, d3 = -1, f3 = 0;
    for (; f3 < s6.length && (c5.lastIndex = f3, u5 = c5.exec(s6), null !== u5); ) f3 = c5.lastIndex, c5 === v ? "!--" === u5[1] ? c5 = _ : void 0 !== u5[1] ? c5 = m2 : void 0 !== u5[2] ? (y2.test(u5[2]) && (n6 = RegExp("</" + u5[2], "g")), c5 = p2) : void 0 !== u5[3] && (c5 = p2) : c5 === p2 ? ">" === u5[0] ? (c5 = n6 ?? v, d3 = -1) : void 0 === u5[1] ? d3 = -2 : (d3 = c5.lastIndex - u5[2].length, a3 = u5[1], c5 = void 0 === u5[3] ? p2 : '"' === u5[3] ? $ : g2) : c5 === $ || c5 === g2 ? c5 = p2 : c5 === _ || c5 === m2 ? c5 = v : (c5 = p2, n6 = void 0);
    const x2 = c5 === p2 && t5[i8 + 1].startsWith("/>") ? " " : "";
    l3 += c5 === v ? s6 + r3 : d3 >= 0 ? (e5.push(a3), s6.slice(0, d3) + h2 + s6.slice(d3) + o3 + x2) : s6 + o3 + (-2 === d3 ? i8 : x2);
  }
  return [V(t5, l3 + (t5[s5] || "<?>") + (2 === i7 ? "</svg>" : 3 === i7 ? "</math>" : "")), e5];
};
var S2 = class _S {
  constructor({ strings: t5, _$litType$: i7 }, e5) {
    let r6;
    this.parts = [];
    let l3 = 0, a3 = 0;
    const u5 = t5.length - 1, d3 = this.parts, [f3, v3] = N(t5, i7);
    if (this.el = _S.createElement(f3, e5), P.currentNode = this.el.content, 2 === i7 || 3 === i7) {
      const t6 = this.el.content.firstChild;
      t6.replaceWith(...t6.childNodes);
    }
    for (; null !== (r6 = P.nextNode()) && d3.length < u5; ) {
      if (1 === r6.nodeType) {
        if (r6.hasAttributes()) for (const t6 of r6.getAttributeNames()) if (t6.endsWith(h2)) {
          const i8 = v3[a3++], s5 = r6.getAttribute(t6).split(o3), e6 = /([.?@])?(.*)/.exec(i8);
          d3.push({ type: 1, index: l3, name: e6[2], strings: s5, ctor: "." === e6[1] ? I : "?" === e6[1] ? L : "@" === e6[1] ? z : H }), r6.removeAttribute(t6);
        } else t6.startsWith(o3) && (d3.push({ type: 6, index: l3 }), r6.removeAttribute(t6));
        if (y2.test(r6.tagName)) {
          const t6 = r6.textContent.split(o3), i8 = t6.length - 1;
          if (i8 > 0) {
            r6.textContent = s2 ? s2.emptyScript : "";
            for (let s5 = 0; s5 < i8; s5++) r6.append(t6[s5], c3()), P.nextNode(), d3.push({ type: 2, index: ++l3 });
            r6.append(t6[i8], c3());
          }
        }
      } else if (8 === r6.nodeType) if (r6.data === n3) d3.push({ type: 2, index: l3 });
      else {
        let t6 = -1;
        for (; -1 !== (t6 = r6.data.indexOf(o3, t6 + 1)); ) d3.push({ type: 7, index: l3 }), t6 += o3.length - 1;
      }
      l3++;
    }
  }
  static createElement(t5, i7) {
    const s5 = l2.createElement("template");
    return s5.innerHTML = t5, s5;
  }
};
function M(t5, i7, s5 = t5, e5) {
  if (i7 === E) return i7;
  let h4 = void 0 !== e5 ? s5._$Co?.[e5] : s5._$Cl;
  const o7 = a2(i7) ? void 0 : i7._$litDirective$;
  return h4?.constructor !== o7 && (h4?._$AO?.(false), void 0 === o7 ? h4 = void 0 : (h4 = new o7(t5), h4._$AT(t5, s5, e5)), void 0 !== e5 ? (s5._$Co ??= [])[e5] = h4 : s5._$Cl = h4), void 0 !== h4 && (i7 = M(t5, h4._$AS(t5, i7.values), h4, e5)), i7;
}
var R = class {
  constructor(t5, i7) {
    this._$AV = [], this._$AN = void 0, this._$AD = t5, this._$AM = i7;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t5) {
    const { el: { content: i7 }, parts: s5 } = this._$AD, e5 = (t5?.creationScope ?? l2).importNode(i7, true);
    P.currentNode = e5;
    let h4 = P.nextNode(), o7 = 0, n6 = 0, r6 = s5[0];
    for (; void 0 !== r6; ) {
      if (o7 === r6.index) {
        let i8;
        2 === r6.type ? i8 = new k(h4, h4.nextSibling, this, t5) : 1 === r6.type ? i8 = new r6.ctor(h4, r6.name, r6.strings, this, t5) : 6 === r6.type && (i8 = new Z(h4, this, t5)), this._$AV.push(i8), r6 = s5[++n6];
      }
      o7 !== r6?.index && (h4 = P.nextNode(), o7++);
    }
    return P.currentNode = l2, e5;
  }
  p(t5) {
    let i7 = 0;
    for (const s5 of this._$AV) void 0 !== s5 && (void 0 !== s5.strings ? (s5._$AI(t5, s5, i7), i7 += s5.strings.length - 2) : s5._$AI(t5[i7])), i7++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t5, i7, s5, e5) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t5, this._$AB = i7, this._$AM = s5, this.options = e5, this._$Cv = e5?.isConnected ?? true;
  }
  get parentNode() {
    let t5 = this._$AA.parentNode;
    const i7 = this._$AM;
    return void 0 !== i7 && 11 === t5?.nodeType && (t5 = i7.parentNode), t5;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t5, i7 = this) {
    t5 = M(this, t5, i7), a2(t5) ? t5 === A || null == t5 || "" === t5 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t5 !== this._$AH && t5 !== E && this._(t5) : void 0 !== t5._$litType$ ? this.$(t5) : void 0 !== t5.nodeType ? this.T(t5) : d2(t5) ? this.k(t5) : this._(t5);
  }
  O(t5) {
    return this._$AA.parentNode.insertBefore(t5, this._$AB);
  }
  T(t5) {
    this._$AH !== t5 && (this._$AR(), this._$AH = this.O(t5));
  }
  _(t5) {
    this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t5 : this.T(l2.createTextNode(t5)), this._$AH = t5;
  }
  $(t5) {
    const { values: i7, _$litType$: s5 } = t5, e5 = "number" == typeof s5 ? this._$AC(t5) : (void 0 === s5.el && (s5.el = S2.createElement(V(s5.h, s5.h[0]), this.options)), s5);
    if (this._$AH?._$AD === e5) this._$AH.p(i7);
    else {
      const t6 = new R(e5, this), s6 = t6.u(this.options);
      t6.p(i7), this.T(s6), this._$AH = t6;
    }
  }
  _$AC(t5) {
    let i7 = C.get(t5.strings);
    return void 0 === i7 && C.set(t5.strings, i7 = new S2(t5)), i7;
  }
  k(t5) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i7 = this._$AH;
    let s5, e5 = 0;
    for (const h4 of t5) e5 === i7.length ? i7.push(s5 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s5 = i7[e5], s5._$AI(h4), e5++;
    e5 < i7.length && (this._$AR(s5 && s5._$AB.nextSibling, e5), i7.length = e5);
  }
  _$AR(t5 = this._$AA.nextSibling, s5) {
    for (this._$AP?.(false, true, s5); t5 !== this._$AB; ) {
      const s6 = i2(t5).nextSibling;
      i2(t5).remove(), t5 = s6;
    }
  }
  setConnected(t5) {
    void 0 === this._$AM && (this._$Cv = t5, this._$AP?.(t5));
  }
};
var H = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t5, i7, s5, e5, h4) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t5, this.name = i7, this._$AM = e5, this.options = h4, s5.length > 2 || "" !== s5[0] || "" !== s5[1] ? (this._$AH = Array(s5.length - 1).fill(new String()), this.strings = s5) : this._$AH = A;
  }
  _$AI(t5, i7 = this, s5, e5) {
    const h4 = this.strings;
    let o7 = false;
    if (void 0 === h4) t5 = M(this, t5, i7, 0), o7 = !a2(t5) || t5 !== this._$AH && t5 !== E, o7 && (this._$AH = t5);
    else {
      const e6 = t5;
      let n6, r6;
      for (t5 = h4[0], n6 = 0; n6 < h4.length - 1; n6++) r6 = M(this, e6[s5 + n6], i7, n6), r6 === E && (r6 = this._$AH[n6]), o7 ||= !a2(r6) || r6 !== this._$AH[n6], r6 === A ? t5 = A : t5 !== A && (t5 += (r6 ?? "") + h4[n6 + 1]), this._$AH[n6] = r6;
    }
    o7 && !e5 && this.j(t5);
  }
  j(t5) {
    t5 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t5 ?? "");
  }
};
var I = class extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t5) {
    this.element[this.name] = t5 === A ? void 0 : t5;
  }
};
var L = class extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t5) {
    this.element.toggleAttribute(this.name, !!t5 && t5 !== A);
  }
};
var z = class extends H {
  constructor(t5, i7, s5, e5, h4) {
    super(t5, i7, s5, e5, h4), this.type = 5;
  }
  _$AI(t5, i7 = this) {
    if ((t5 = M(this, t5, i7, 0) ?? A) === E) return;
    const s5 = this._$AH, e5 = t5 === A && s5 !== A || t5.capture !== s5.capture || t5.once !== s5.once || t5.passive !== s5.passive, h4 = t5 !== A && (s5 === A || e5);
    e5 && this.element.removeEventListener(this.name, this, s5), h4 && this.element.addEventListener(this.name, this, t5), this._$AH = t5;
  }
  handleEvent(t5) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t5) : this._$AH.handleEvent(t5);
  }
};
var Z = class {
  constructor(t5, i7, s5) {
    this.element = t5, this.type = 6, this._$AN = void 0, this._$AM = i7, this.options = s5;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t5) {
    M(this, t5);
  }
};
var j = { M: h2, P: o3, A: n3, C: 1, L: N, R, D: d2, V: M, I: k, H, N: L, U: z, B: I, F: Z };
var B = t2.litHtmlPolyfillSupport;
B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.3");
var D = (t5, i7, s5) => {
  const e5 = s5?.renderBefore ?? i7;
  let h4 = e5._$litPart$;
  if (void 0 === h4) {
    const t6 = s5?.renderBefore ?? null;
    e5._$litPart$ = h4 = new k(i7.insertBefore(c3(), t6), t6, void 0, s5 ?? {});
  }
  return h4._$AI(t5), h4;
};

// lit-element/lit-element.js
var s3 = globalThis;
var i3 = class extends g {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t5 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t5.firstChild, t5;
  }
  update(t5) {
    const r6 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t5), this._$Do = D(r6, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(true);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(false);
  }
  render() {
    return E;
  }
};
i3._$litElement$ = true, i3["finalized"] = true, s3.litElementHydrateSupport?.({ LitElement: i3 });
var o4 = s3.litElementPolyfillSupport;
o4?.({ LitElement: i3 });
(s3.litElementVersions ??= []).push("4.2.2");

// @lit/reactive-element/node/decorators/property.js
var o5 = { attribute: true, type: String, converter: b, reflect: false, hasChanged: m };
var r4 = (t5 = o5, e5, r6) => {
  const { kind: n6, metadata: i7 } = r6;
  let s5 = globalThis.litPropertyMetadata.get(i7);
  if (void 0 === s5 && globalThis.litPropertyMetadata.set(i7, s5 = /* @__PURE__ */ new Map()), "setter" === n6 && ((t5 = Object.create(t5)).wrapped = true), s5.set(r6.name, t5), "accessor" === n6) {
    const { name: o7 } = r6;
    return { set(r7) {
      const n7 = e5.get.call(this);
      e5.set.call(this, r7), this.requestUpdate(o7, n7, t5, true, r7);
    }, init(e6) {
      return void 0 !== e6 && this.C(o7, void 0, t5, e6), e6;
    } };
  }
  if ("setter" === n6) {
    const { name: o7 } = r6;
    return function(r7) {
      const n7 = this[o7];
      e5.call(this, r7), this.requestUpdate(o7, n7, t5, true, r7);
    };
  }
  throw Error("Unsupported decorator location: " + n6);
};
function n4(t5) {
  return (e5, o7) => "object" == typeof o7 ? r4(t5, e5, o7) : ((t6, e6, o8) => {
    const r6 = e6.hasOwnProperty(o8);
    return e6.constructor.createProperty(o8, t6), r6 ? Object.getOwnPropertyDescriptor(e6, o8) : void 0;
  })(t5, e5, o7);
}

// @lit/reactive-element/node/decorators/state.js
function r5(r6) {
  return n4({ ...r6, state: true, attribute: false });
}

// @erplora/outfitkit/dist/define.js
function define(tag, ctor) {
  if (typeof customElements !== "undefined" && !customElements.get(tag)) {
    customElements.define(tag, ctor);
  }
}

// @erplora/outfitkit/dist/shared/icons.js
var rawAdd = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M256 112v288m144-144H112"/></svg>';
var rawAlertCircle = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208s208-93.31 208-208S370.69 48 256 48m0 319.91a20 20 0 1 1 20-20a20 20 0 0 1-20 20m21.72-201.15l-5.74 122a16 16 0 0 1-32 0l-5.74-121.94v-.05a21.74 21.74 0 1 1 43.44 0Z"/></svg>';
var rawAlertCircleOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192s192-86 192-192Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M250.26 166.05L256 288l5.73-121.95a5.74 5.74 0 0 0-5.79-6h0a5.74 5.74 0 0 0-5.68 6"/><path fill="currentColor" d="M256 367.91a20 20 0 1 1 20-20a20 20 0 0 1-20 20"/></svg>';
var rawAppsOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><rect width="80" height="80" x="64" y="64" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="216" y="64" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="368" y="64" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="64" y="216" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="216" y="216" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="368" y="216" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="64" y="368" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="216" y="368" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="368" y="368" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/></svg>';
var rawArchiveOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M80 152v256a40.12 40.12 0 0 0 40 40h272a40.12 40.12 0 0 0 40-40V152"/><rect width="416" height="80" x="48" y="64" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" rx="28" ry="28"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m320 304l-64 64l-64-64m64 41.89V224"/></svg>';
var rawArrowRedoOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M448 256L272 88v96C103.57 184 64 304.77 64 424c48.61-62.24 91.6-96 208-96v96Z"/></svg>';
var rawArrowUndoOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M240 424v-96c116.4 0 159.39 33.76 208 96c0-119.23-39.57-240-208-240V88L64 256Z"/></svg>';
var rawBackspaceOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M135.19 390.14a28.8 28.8 0 0 0 21.68 9.86h246.26A29 29 0 0 0 432 371.13V140.87A29 29 0 0 0 403.13 112H156.87a28.84 28.84 0 0 0-21.67 9.84L46.33 256l88.86 134.11Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M336.67 192.33L206.66 322.34m130.01 0L206.66 192.33m130.01 0L206.66 322.34m130.01 0L206.66 192.33"/></svg>';
var rawCalendarOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><rect width="416" height="384" x="48" y="80" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" rx="48"/><circle cx="296" cy="232" r="24" fill="currentColor"/><circle cx="376" cy="232" r="24" fill="currentColor"/><circle cx="296" cy="312" r="24" fill="currentColor"/><circle cx="376" cy="312" r="24" fill="currentColor"/><circle cx="136" cy="312" r="24" fill="currentColor"/><circle cx="216" cy="312" r="24" fill="currentColor"/><circle cx="136" cy="392" r="24" fill="currentColor"/><circle cx="216" cy="392" r="24" fill="currentColor"/><circle cx="296" cy="392" r="24" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M128 48v32m256-32v32"/><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M464 160H48"/></svg>';
var rawCheckmarkCircle = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208s208-93.31 208-208S370.69 48 256 48m108.25 138.29l-134.4 160a16 16 0 0 1-12 5.71h-.27a16 16 0 0 1-11.89-5.3l-57.6-64a16 16 0 1 1 23.78-21.4l45.29 50.32l122.59-145.91a16 16 0 0 1 24.5 20.58"/></svg>';
var rawCheckmarkOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M416 128L192 384l-96-96"/></svg>';
var rawChevronBack = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M328 112L184 256l144 144"/></svg>';
var rawChevronBackOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M328 112L184 256l144 144"/></svg>';
var rawChevronDownOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="m112 184l144 144l144-144"/></svg>';
var rawChevronForward = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="m184 112l144 144l-144 144"/></svg>';
var rawChevronForwardOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="m184 112l144 144l-144 144"/></svg>';
var rawChevronUpOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="m112 328l144-144l144 144"/></svg>';
var rawClose = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="m289.94 256l95-95A24 24 0 0 0 351 127l-95 95l-95-95a24 24 0 0 0-34 34l95 95l-95 95a24 24 0 1 0 34 34l95-95l95 95a24 24 0 0 0 34-34Z"/></svg>';
var rawCloseOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M368 368L144 144m224 0L144 368"/></svg>';
var rawCloudUploadOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M320 367.79h76c55 0 100-29.21 100-83.6s-53-81.47-96-83.6c-8.89-85.06-71-136.8-144-136.8c-69 0-113.44 45.79-128 91.2c-60 5.7-112 43.88-112 106.4s54 106.4 120 106.4h56"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m320 255.79l-64-64l-64 64m64 192.42V207.79"/></svg>';
var rawCreateOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M384 224v184a40 40 0 0 1-40 40H104a40 40 0 0 1-40-40V168a40 40 0 0 1 40-40h167.48"/><path fill="currentColor" d="M459.94 53.25a16.06 16.06 0 0 0-23.22-.56L424.35 65a8 8 0 0 0 0 11.31l11.34 11.32a8 8 0 0 0 11.34 0l12.06-12c6.1-6.09 6.67-16.01.85-22.38M399.34 90L218.82 270.2a9 9 0 0 0-2.31 3.93L208.16 299a3.91 3.91 0 0 0 4.86 4.86l24.85-8.35a9 9 0 0 0 3.93-2.31L422 112.66a9 9 0 0 0 0-12.66l-9.95-10a9 9 0 0 0-12.71 0"/></svg>';
var rawContractOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M304 416V304h112m-101.8 10.23L432 432M208 96v112H96m101.8-10.23L80 80m336 128H304V96m10.23 101.8L432 80M96 304h112v112m-10.23-101.8L80 432"/></svg>';
var rawDocumentAttachOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M208 64h66.75a32 32 0 0 1 22.62 9.37l141.26 141.26a32 32 0 0 1 9.37 22.62V432a48 48 0 0 1-48 48H192a48 48 0 0 1-48-48V304"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M288 72v120a32 32 0 0 0 32 32h120"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M160 80v152a23.69 23.69 0 0 1-24 24c-12 0-24-9.1-24-24V88c0-30.59 16.57-56 48-56s48 24.8 48 55.38v138.75c0 43-27.82 77.87-72 77.87s-72-34.86-72-77.87V144"/></svg>';
var rawDocumentOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M416 221.25V416a48 48 0 0 1-48 48H144a48 48 0 0 1-48-48V96a48 48 0 0 1 48-48h98.75a32 32 0 0 1 22.62 9.37l141.26 141.26a32 32 0 0 1 9.37 22.62Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M256 56v120a32 32 0 0 0 32 32h120"/></svg>';
var rawDocumentTextOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M416 221.25V416a48 48 0 0 1-48 48H144a48 48 0 0 1-48-48V96a48 48 0 0 1 48-48h98.75a32 32 0 0 1 22.62 9.37l141.26 141.26a32 32 0 0 1 9.37 22.62Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M256 56v120a32 32 0 0 0 32 32h120m-232 80h160m-160 80h160"/></svg>';
var rawDownloadOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M336 176h40a40 40 0 0 1 40 40v208a40 40 0 0 1-40 40H136a40 40 0 0 1-40-40V216a40 40 0 0 1 40-40h40"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m176 272l80 80l80-80M256 48v288"/></svg>';
var rawEllipsisVertical = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><circle cx="256" cy="256" r="48" fill="currentColor"/><circle cx="256" cy="416" r="48" fill="currentColor"/><circle cx="256" cy="96" r="48" fill="currentColor"/></svg>';
var rawExpandOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M432 320v112H320m101.8-10.23L304 304M80 192V80h112M90.2 90.23L208 208M320 80h112v112M421.77 90.2L304 208M192 432H80V320m10.23 101.8L208 304"/></svg>';
var rawFileTrayOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M384 80H128c-26 0-43 14-48 40L48 272v112a48.14 48.14 0 0 0 48 48h320a48.14 48.14 0 0 0 48-48V272l-32-152c-5-27-23-40-48-40Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M48 272h144m128 0h144m-272 0a64 64 0 0 0 128 0"/></svg>';
var rawFolderOpenOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M64 192v-72a40 40 0 0 1 40-40h75.89a40 40 0 0 1 22.19 6.72l27.84 18.56a40 40 0 0 0 22.19 6.72H408a40 40 0 0 1 40 40v40"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M479.9 226.55L463.68 392a40 40 0 0 1-39.93 40H88.25a40 40 0 0 1-39.93-40L32.1 226.55A32 32 0 0 1 64 192h384.1a32 32 0 0 1 31.8 34.55"/></svg>';
var rawInformationCircle = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="M256 56C145.72 56 56 145.72 56 256s89.72 200 200 200s200-89.72 200-200S366.28 56 256 56m0 82a26 26 0 1 1-26 26a26 26 0 0 1 26-26m48 226h-88a16 16 0 0 1 0-32h28v-88h-16a16 16 0 0 1 0-32h32a16 16 0 0 1 16 16v104h28a16 16 0 0 1 0 32"/></svg>';
var rawMenuOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M80 160h352M80 256h352M80 352h352"/></svg>';
var rawNotificationsOffOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M128.51 204.59q-.37 6.15-.37 12.76C128.14 304 110 320 84.33 351.43C73.69 364.45 83 384 101.62 384H320m94.5-48.7c-18.48-23.45-30.62-47.05-30.62-118c0-79.3-40.52-107.57-73.88-121.3c-4.43-1.82-8.6-6-9.95-10.55C294.21 65.54 277.82 48 256 48s-38.2 17.55-44 37.47c-1.35 4.6-5.52 8.71-10 10.53a150 150 0 0 0-18 8.79M320 384v16a64 64 0 0 1-128 0v-16"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M448 448L64 64"/></svg>';
var rawOpenOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M384 224v184a40 40 0 0 1-40 40H104a40 40 0 0 1-40-40V168a40 40 0 0 1 40-40h167.48M336 64h112v112M224 288L440 72"/></svg>';
var rawPlayOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" d="M112 111v290c0 17.44 17 28.52 31 20.16l247.9-148.37c12.12-7.25 12.12-26.33 0-33.58L143 90.84c-14-8.36-31 2.72-31 20.16Z"/></svg>';
var rawRemove = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M400 256H112"/></svg>';
var rawSearchOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" d="M221.09 64a157.09 157.09 0 1 0 157.09 157.09A157.1 157.1 0 0 0 221.09 64Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M338.29 338.29L448 448"/></svg>';
var rawSend = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="m476.59 227.05l-.16-.07L49.35 49.84A23.56 23.56 0 0 0 27.14 52A24.65 24.65 0 0 0 16 72.59v113.29a24 24 0 0 0 19.52 23.57l232.93 43.07a4 4 0 0 1 0 7.86L35.53 303.45A24 24 0 0 0 16 327v113.31A23.57 23.57 0 0 0 26.59 460a23.94 23.94 0 0 0 13.22 4a24.55 24.55 0 0 0 9.52-1.93L476.4 285.94l.19-.09a32 32 0 0 0 0-58.8"/></svg>';
var rawSwapVerticalOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M464 208L352 96L240 208m112-94.87V416M48 304l112 112l112-112m-112 94V96"/></svg>';
var rawTrashOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m112 112l20 320c.95 18.49 14.4 32 32 32h184c17.67 0 30.87-13.51 32-32l20-320"/><path fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M80 112h352"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M192 112V72h0a23.93 23.93 0 0 1 24-24h80a23.93 23.93 0 0 1 24 24h0v40m-64 64v224m-72-224l8 224m136-224l-8 224"/></svg>';
var rawTrendingDown = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M352 368h112V256"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m48 144l121.37 121.37a32 32 0 0 0 45.26 0l50.74-50.74a32 32 0 0 1 45.26 0L448 352"/></svg>';
var rawTrendingUp = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M352 144h112v112"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m48 368l121.37-121.37a32 32 0 0 1 45.26 0l50.74 50.74a32 32 0 0 0 45.26 0L448 160"/></svg>';
var rawVolumeHighOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M126 192H56a8 8 0 0 0-8 8v112a8 8 0 0 0 8 8h69.65a15.93 15.93 0 0 1 10.14 3.54l91.47 74.89A8 8 0 0 0 240 392V120a8 8 0 0 0-12.74-6.43l-91.47 74.89A15 15 0 0 1 126 192m194 128c9.74-19.38 16-40.84 16-64c0-23.48-6-44.42-16-64m48 176c19.48-33.92 32-64.06 32-112s-12-77.74-32-112m48 272c30-46 48-91.43 48-160s-18-113-48-160"/></svg>';
var rawVolumeLowOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M189.65 192H120a8 8 0 0 0-8 8v112a8 8 0 0 0 8 8h69.65a16 16 0 0 1 10.14 3.63l91.47 75a8 8 0 0 0 12.74-6.46V119.83a8 8 0 0 0-12.74-6.44l-91.47 75a16 16 0 0 1-10.14 3.61M384 320c9.74-19.41 16-40.81 16-64c0-23.51-6-44.4-16-64"/></svg>';
var rawVolumeMuteOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M416 432L64 80"/><path fill="currentColor" d="M224 136.92v33.8a4 4 0 0 0 1.17 2.82l24 24a4 4 0 0 0 6.83-2.82v-74.15a24.53 24.53 0 0 0-12.67-21.72a23.91 23.91 0 0 0-25.55 1.83a8 8 0 0 0-.66.51l-31.94 26.15a4 4 0 0 0-.29 5.92l17.05 17.06a4 4 0 0 0 5.37.26Zm0 238.16l-78.07-63.92a32 32 0 0 0-20.28-7.16H64v-96h50.72a4 4 0 0 0 2.82-6.83l-24-24a4 4 0 0 0-2.82-1.17H56a24 24 0 0 0-24 24v112a24 24 0 0 0 24 24h69.76l91.36 74.8a8 8 0 0 0 .66.51a23.93 23.93 0 0 0 25.85 1.69A24.49 24.49 0 0 0 256 391.45v-50.17a4 4 0 0 0-1.17-2.82l-24-24a4 4 0 0 0-6.83 2.82ZM352 256c0-24.56-5.81-47.88-17.75-71.27a16 16 0 0 0-28.5 14.54C315.34 218.06 320 236.62 320 256q0 4-.31 8.13a8 8 0 0 0 2.32 6.25l19.66 19.67a4 4 0 0 0 6.75-2A147 147 0 0 0 352 256m64 0c0-51.19-13.08-83.89-34.18-120.06a16 16 0 0 0-27.64 16.12C373.07 184.44 384 211.83 384 256c0 23.83-3.29 42.88-9.37 60.65a8 8 0 0 0 1.9 8.26l16.77 16.76a4 4 0 0 0 6.52-1.27C410.09 315.88 416 289.91 416 256"/><path fill="currentColor" d="M480 256c0-74.26-20.19-121.11-50.51-168.61a16 16 0 1 0-27 17.22C429.82 147.38 448 189.5 448 256c0 47.45-8.9 82.12-23.59 113a4 4 0 0 0 .77 4.55L443 391.39a4 4 0 0 0 6.4-1C470.88 348.22 480 307 480 256"/></svg>';
var rawWarning = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="M449.07 399.08L278.64 82.58c-12.08-22.44-44.26-22.44-56.35 0L51.87 399.08A32 32 0 0 0 80 446.25h340.89a32 32 0 0 0 28.18-47.17m-198.6-1.83a20 20 0 1 1 20-20a20 20 0 0 1-20 20m21.72-201.15l-5.74 122a16 16 0 0 1-32 0l-5.74-121.95a21.73 21.73 0 0 1 21.5-22.69h.21a21.74 21.74 0 0 1 21.73 22.7Z"/></svg>';
function bake(svg) {
  return `data:image/svg+xml;utf8,${svg}`;
}
var iconAdd = bake(rawAdd);
var iconAlertCircle = bake(rawAlertCircle);
var iconAlertCircleOutline = bake(rawAlertCircleOutline);
var iconAppsOutline = bake(rawAppsOutline);
var iconArchiveOutline = bake(rawArchiveOutline);
var iconArrowRedoOutline = bake(rawArrowRedoOutline);
var iconArrowUndoOutline = bake(rawArrowUndoOutline);
var iconBackspaceOutline = bake(rawBackspaceOutline);
var iconCalendarOutline = bake(rawCalendarOutline);
var iconCheckmarkCircle = bake(rawCheckmarkCircle);
var iconCheckmarkOutline = bake(rawCheckmarkOutline);
var iconChevronBack = bake(rawChevronBack);
var iconChevronBackOutline = bake(rawChevronBackOutline);
var iconChevronDownOutline = bake(rawChevronDownOutline);
var iconChevronForward = bake(rawChevronForward);
var iconChevronForwardOutline = bake(rawChevronForwardOutline);
var iconChevronUpOutline = bake(rawChevronUpOutline);
var iconClose = bake(rawClose);
var iconCloseOutline = bake(rawCloseOutline);
var iconCloudUploadOutline = bake(rawCloudUploadOutline);
var iconCreateOutline = bake(rawCreateOutline);
var iconDocumentAttachOutline = bake(rawDocumentAttachOutline);
var iconContractOutline = bake(rawContractOutline);
var iconDocumentOutline = bake(rawDocumentOutline);
var iconDocumentTextOutline = bake(rawDocumentTextOutline);
var iconDownloadOutline = bake(rawDownloadOutline);
var iconEllipsisVertical = bake(rawEllipsisVertical);
var iconExpandOutline = bake(rawExpandOutline);
var iconFileTrayOutline = bake(rawFileTrayOutline);
var iconFolderOpenOutline = bake(rawFolderOpenOutline);
var iconInformationCircle = bake(rawInformationCircle);
var iconMenuOutline = bake(rawMenuOutline);
var iconNotificationsOffOutline = bake(rawNotificationsOffOutline);
var iconOpenOutline = bake(rawOpenOutline);
var iconPlayOutline = bake(rawPlayOutline);
var iconRemove = bake(rawRemove);
var iconSearchOutline = bake(rawSearchOutline);
var iconSend = bake(rawSend);
var iconSwapVerticalOutline = bake(rawSwapVerticalOutline);
var iconTrashOutline = bake(rawTrashOutline);
var iconTrendingDown = bake(rawTrendingDown);
var iconTrendingUp = bake(rawTrendingUp);
var iconVolumeHighOutline = bake(rawVolumeHighOutline);
var iconVolumeLowOutline = bake(rawVolumeLowOutline);
var iconVolumeMuteOutline = bake(rawVolumeMuteOutline);
var iconWarning = bake(rawWarning);
var BY_NAME = {
  "add": iconAdd,
  "alert-circle": iconAlertCircle,
  "alert-circle-outline": iconAlertCircleOutline,
  "apps-outline": iconAppsOutline,
  "archive-outline": iconArchiveOutline,
  "arrow-redo-outline": iconArrowRedoOutline,
  "arrow-undo-outline": iconArrowUndoOutline,
  "backspace-outline": iconBackspaceOutline,
  "calendar-outline": iconCalendarOutline,
  "checkmark-circle": iconCheckmarkCircle,
  "checkmark-outline": iconCheckmarkOutline,
  "chevron-back": iconChevronBack,
  "chevron-back-outline": iconChevronBackOutline,
  "chevron-down-outline": iconChevronDownOutline,
  "chevron-forward": iconChevronForward,
  "chevron-forward-outline": iconChevronForwardOutline,
  "chevron-up-outline": iconChevronUpOutline,
  "close": iconClose,
  "close-outline": iconCloseOutline,
  "cloud-upload-outline": iconCloudUploadOutline,
  "create-outline": iconCreateOutline,
  "document-attach-outline": iconDocumentAttachOutline,
  "contract-outline": iconContractOutline,
  "document-outline": iconDocumentOutline,
  "document-text-outline": iconDocumentTextOutline,
  "download-outline": iconDownloadOutline,
  "ellipsis-vertical": iconEllipsisVertical,
  "expand-outline": iconExpandOutline,
  "file-tray-outline": iconFileTrayOutline,
  "folder-open-outline": iconFolderOpenOutline,
  "information-circle": iconInformationCircle,
  "menu-outline": iconMenuOutline,
  "notifications-off-outline": iconNotificationsOffOutline,
  "open-outline": iconOpenOutline,
  "play-outline": iconPlayOutline,
  "remove": iconRemove,
  "search-outline": iconSearchOutline,
  "send": iconSend,
  "swap-vertical-outline": iconSwapVerticalOutline,
  "trash-outline": iconTrashOutline,
  "trending-down": iconTrendingDown,
  "trending-up": iconTrendingUp,
  "volume-high-outline": iconVolumeHighOutline,
  "volume-low-outline": iconVolumeLowOutline,
  "volume-mute-outline": iconVolumeMuteOutline,
  "warning": iconWarning
};
function okIcon(value) {
  if (!value) return void 0;
  const trimmed = value.trimStart();
  if (trimmed.startsWith("<svg")) return bake(trimmed);
  return BY_NAME[value] ?? value;
}

// @erplora/outfitkit/dist/ok-inline-feedback.js
var __defProp2 = Object.defineProperty;
var __decorateClass2 = (decorators, target, key, kind) => {
  var result = void 0;
  for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
    if (decorator = decorators[i7])
      result = decorator(target, key, result) || result;
  if (result) __defProp2(target, key, result);
  return result;
};
var DEFAULT_LABELS = {
  dismiss: "Dismiss"
};
var OkInlineFeedback = class extends i3 {
  constructor() {
    super(...arguments);
    this.tone = "info";
    this.dismissible = false;
    this.hidden = false;
    this.labels = {};
    this.hasActions = false;
    this.onActionsSlotChange = (e5) => {
      const slot = e5.target;
      this.hasActions = slot.assignedNodes({ flatten: true }).length > 0;
    };
  }
  static {
    this.styles = i`
    :host {
      /* Vars overridable (estilo Ionic), default = cadena --ok-* → --ion-* → hex.
         --tone-color y --tone-icon se reasignan por tone abajo. */
      --tone-color: var(--ok-primary, var(--ion-color-primary, #3880ff));
      --background-opacity: 0.1;
      --color: var(--ok-text, var(--ion-text-color, #1c1b17));
      --border-radius: var(--ok-radius, var(--ion-border-radius, 8px));
      --padding: var(--ok-spacing, var(--ion-padding, 16px));
      --accent-width: 4px;
      --font: var(--ok-font, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif);

      /* Responsive: el banner ocupa el ancho del contenedor. */
      display: block;
      width: 100%;
      font-family: var(--font);
      box-sizing: border-box;
    }
    :host([hidden]) { display: none; }

    /* Mapa de tonos → color Ionic + icono por defecto. */
    :host([tone='success']) { --tone-color: var(--ok-success, var(--ion-color-success, #2dd55b)); }
    :host([tone='warning']) { --tone-color: var(--ok-warning, var(--ion-color-warning, #ffc409)); }
    :host([tone='danger'])  { --tone-color: var(--ok-danger, var(--ion-color-danger, #c5000f)); }
    :host([tone='neutral']) { --tone-color: var(--ok-medium, var(--ion-color-medium, #5f5f5f)); }
    /* info / sin tono → primary (default ya aplicado en :host). */

    .box {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: var(--padding);
      border-radius: var(--border-radius);
      border-inline-start: var(--accent-width) solid var(--tone-color);
      /* Fondo tonal: el color del tono con baja opacidad (color-mix con fallback al borde fino). */
      background: color-mix(in srgb, var(--tone-color) calc(var(--background-opacity) * 100%), transparent);
      color: var(--color);
    }

    .icon {
      flex: 0 0 auto;
      font-size: 1.4rem;
      line-height: 1;
      color: var(--tone-color);
      margin-top: 0.05rem;
    }

    .content {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .row {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }
    .text {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .heading {
      font-weight: 700;
      font-size: 0.98rem;
      line-height: 1.3;
    }
    .body {
      font-size: 0.92rem;
      line-height: 1.45;
    }
    .actions {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    /* Si no hay actions, el slot queda vacío y no ocupa espacio. */
    .actions.empty { display: none; }

    .close {
      flex: 0 0 auto;
      background: none;
      border: 0;
      cursor: pointer;
      padding: 0.15rem;
      margin: -0.15rem -0.15rem 0 0;
      color: inherit;
      opacity: 0.6;
      font-size: 1.2rem;
      line-height: 1;
      border-radius: 4px;
      transition: background-color var(--ok-transition, 150ms ease), color var(--ok-transition, 150ms ease),
        border-color var(--ok-transition, 150ms ease), box-shadow var(--ok-transition, 150ms ease),
        opacity 0.15s ease, transform 120ms ease;
    }
    @media (hover: hover) {
      .close:hover { opacity: 1; background: rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.07); }
    }
    .close:active { transform: scale(var(--ok-press-scale, 0.97)); }

    /* Móvil: las actions bajan bajo el texto (apiladas a ancho completo). */
    @media (max-width: 640px) {
      .row { flex-direction: column; align-items: stretch; }
      .actions { width: 100%; }
    }
    @media (prefers-reduced-motion: reduce) {
      .close:hover,
      .close:active { transform: none; }
    }
  `;
  }
  // Textos efectivos: defaults en inglés + overrides del consumidor.
  get t() {
    return { ...DEFAULT_LABELS, ...this.labels };
  }
  // Icono por defecto según el tono (overridable por la prop `icon`).
  defaultIcon() {
    switch (this.tone) {
      case "success":
        return iconCheckmarkCircle;
      case "warning":
        return iconWarning;
      case "danger":
        return iconAlertCircle;
      case "neutral":
        return iconInformationCircle;
      case "info":
      default:
        return iconInformationCircle;
    }
  }
  // Oculta el banner y avisa al consumidor; éste puede revertir restaurando `hidden=false`.
  dismiss() {
    this.hidden = true;
    this.dispatchEvent(new CustomEvent("ok-dismiss", { bubbles: true, composed: true }));
  }
  render() {
    const iconName = this.icon ?? this.defaultIcon();
    return b2`
      <div class="box" role="status">
        <ion-icon class="icon" .icon=${okIcon(iconName)} aria-hidden="true"></ion-icon>
        <div class="content">
          <div class="row">
            <div class="text">
              ${this.heading ? b2`<div class="heading">${this.heading}</div>` : null}
              <div class="body"><slot></slot></div>
            </div>
            <div class="actions ${this.hasActions ? "" : "empty"}">
              <slot name="actions" @slotchange=${this.onActionsSlotChange}></slot>
            </div>
          </div>
        </div>
        ${this.dismissible ? b2`
              <button class="close" aria-label=${this.t.dismiss} @click=${this.dismiss}>
                <ion-icon .icon=${iconClose} aria-hidden="true"></ion-icon>
              </button>
            ` : null}
      </div>
    `;
  }
};
__decorateClass2([
  n4({ type: String, reflect: true })
], OkInlineFeedback.prototype, "tone");
__decorateClass2([
  n4({ type: String })
], OkInlineFeedback.prototype, "heading");
__decorateClass2([
  n4({ type: String })
], OkInlineFeedback.prototype, "icon");
__decorateClass2([
  n4({ type: Boolean, reflect: true })
], OkInlineFeedback.prototype, "dismissible");
__decorateClass2([
  n4({ type: Boolean, reflect: true })
], OkInlineFeedback.prototype, "hidden");
__decorateClass2([
  n4({ attribute: false })
], OkInlineFeedback.prototype, "labels");
__decorateClass2([
  r5()
], OkInlineFeedback.prototype, "hasActions");
define("ok-inline-feedback", OkInlineFeedback);

// lit-html/directive.js
var t3 = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4, EVENT: 5, ELEMENT: 6 };
var e4 = (t5) => (...e5) => ({ _$litDirective$: t5, values: e5 });
var i4 = class {
  constructor(t5) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t5, e5, i7) {
    this._$Ct = t5, this._$AM = e5, this._$Ci = i7;
  }
  _$AS(t5, e5) {
    return this.update(t5, e5);
  }
  update(t5, e5) {
    return this.render(...e5);
  }
};

// lit-html/directive-helpers.js
var { I: t4 } = j;
var i5 = (o7) => o7;
var s4 = () => document.createComment("");
var v2 = (o7, n6, e5) => {
  const l3 = o7._$AA.parentNode, d3 = void 0 === n6 ? o7._$AB : n6._$AA;
  if (void 0 === e5) {
    const i7 = l3.insertBefore(s4(), d3), n7 = l3.insertBefore(s4(), d3);
    e5 = new t4(i7, n7, o7, o7.options);
  } else {
    const t5 = e5._$AB.nextSibling, n7 = e5._$AM, c5 = n7 !== o7;
    if (c5) {
      let t6;
      e5._$AQ?.(o7), e5._$AM = o7, void 0 !== e5._$AP && (t6 = o7._$AU) !== n7._$AU && e5._$AP(t6);
    }
    if (t5 !== d3 || c5) {
      let o8 = e5._$AA;
      for (; o8 !== t5; ) {
        const t6 = i5(o8).nextSibling;
        i5(l3).insertBefore(o8, d3), o8 = t6;
      }
    }
  }
  return e5;
};
var u3 = (o7, t5, i7 = o7) => (o7._$AI(t5, i7), o7);
var m3 = {};
var p3 = (o7, t5 = m3) => o7._$AH = t5;
var M2 = (o7) => o7._$AH;
var h3 = (o7) => {
  o7._$AR(), o7._$AA.remove();
};

// lit-html/directives/repeat.js
var u4 = (e5, s5, t5) => {
  const r6 = /* @__PURE__ */ new Map();
  for (let l3 = s5; l3 <= t5; l3++) r6.set(e5[l3], l3);
  return r6;
};
var c4 = e4(class extends i4 {
  constructor(e5) {
    if (super(e5), e5.type !== t3.CHILD) throw Error("repeat() can only be used in text expressions");
  }
  dt(e5, s5, t5) {
    let r6;
    void 0 === t5 ? t5 = s5 : void 0 !== s5 && (r6 = s5);
    const l3 = [], o7 = [];
    let i7 = 0;
    for (const s6 of e5) l3[i7] = r6 ? r6(s6, i7) : i7, o7[i7] = t5(s6, i7), i7++;
    return { values: o7, keys: l3 };
  }
  render(e5, s5, t5) {
    return this.dt(e5, s5, t5).values;
  }
  update(s5, [t5, r6, c5]) {
    const d3 = M2(s5), { values: p4, keys: a3 } = this.dt(t5, r6, c5);
    if (!Array.isArray(d3)) return this.ut = a3, p4;
    const h4 = this.ut ??= [], v3 = [];
    let m4, y3, x2 = 0, j2 = d3.length - 1, k2 = 0, w2 = p4.length - 1;
    for (; x2 <= j2 && k2 <= w2; ) if (null === d3[x2]) x2++;
    else if (null === d3[j2]) j2--;
    else if (h4[x2] === a3[k2]) v3[k2] = u3(d3[x2], p4[k2]), x2++, k2++;
    else if (h4[j2] === a3[w2]) v3[w2] = u3(d3[j2], p4[w2]), j2--, w2--;
    else if (h4[x2] === a3[w2]) v3[w2] = u3(d3[x2], p4[w2]), v2(s5, v3[w2 + 1], d3[x2]), x2++, w2--;
    else if (h4[j2] === a3[k2]) v3[k2] = u3(d3[j2], p4[k2]), v2(s5, d3[x2], d3[j2]), j2--, k2++;
    else if (void 0 === m4 && (m4 = u4(a3, k2, w2), y3 = u4(h4, x2, j2)), m4.has(h4[x2])) if (m4.has(h4[j2])) {
      const e5 = y3.get(a3[k2]), t6 = void 0 !== e5 ? d3[e5] : null;
      if (null === t6) {
        const e6 = v2(s5, d3[x2]);
        u3(e6, p4[k2]), v3[k2] = e6;
      } else v3[k2] = u3(t6, p4[k2]), v2(s5, d3[x2], t6), d3[e5] = null;
      k2++;
    } else h3(d3[j2]), j2--;
    else h3(d3[x2]), x2++;
    for (; k2 <= w2; ) {
      const e5 = v2(s5, v3[w2 + 1]);
      u3(e5, p4[k2]), v3[k2++] = e5;
    }
    for (; x2 <= j2; ) {
      const e5 = d3[x2++];
      null !== e5 && h3(e5);
    }
    return this.ut = a3, p3(s5, v3), E;
  }
});

// lit-html/directives/style-map.js
var n5 = "important";
var i6 = " !" + n5;
var o6 = e4(class extends i4 {
  constructor(t5) {
    if (super(t5), t5.type !== t3.ATTRIBUTE || "style" !== t5.name || t5.strings?.length > 2) throw Error("The `styleMap` directive must be used in the `style` attribute and must be the only part in the attribute.");
  }
  render(t5) {
    return Object.keys(t5).reduce((e5, r6) => {
      const s5 = t5[r6];
      return null == s5 ? e5 : e5 + `${r6 = r6.includes("-") ? r6 : r6.replace(/(?:^(webkit|moz|ms|o)|)(?=[A-Z])/g, "-$&").toLowerCase()}:${s5};`;
    }, "");
  }
  update(e5, [r6]) {
    const { style: s5 } = e5.element;
    if (void 0 === this.ft) return this.ft = new Set(Object.keys(r6)), this.render(r6);
    for (const t5 of this.ft) null == r6[t5] && (this.ft.delete(t5), t5.includes("-") ? s5.removeProperty(t5) : s5[t5] = null);
    for (const t5 in r6) {
      const e6 = r6[t5];
      if (null != e6) {
        this.ft.add(t5);
        const r7 = "string" == typeof e6 && e6.endsWith(i6);
        t5.includes("-") || r7 ? s5.setProperty(t5, r7 ? e6.slice(0, -11) : e6, r7 ? n5 : "") : s5[t5] = e6;
      }
    }
    return E;
  }
});

// @erplora/outfitkit/dist/ok-data-table.js
var CSV_BOM = "\uFEFF";
var WINDOWS_1252_C1 = [
  8364,
  129,
  8218,
  402,
  8222,
  8230,
  8224,
  8225,
  710,
  8240,
  352,
  8249,
  338,
  141,
  381,
  143,
  144,
  8216,
  8217,
  8220,
  8221,
  8226,
  8211,
  8212,
  732,
  8482,
  353,
  8250,
  339,
  157,
  382,
  376
];
function decodeWindows1252(bytes) {
  let text = "";
  for (const byte of bytes) {
    text += String.fromCharCode(byte >= 128 && byte <= 159 ? WINDOWS_1252_C1[byte - 128] : byte);
  }
  return text;
}
function decodeCsvBuffer(buf) {
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    text = decodeWindows1252(new Uint8Array(buf));
  }
  return text.charCodeAt(0) === 65279 ? text.slice(1) : text;
}
var __defProp3 = Object.defineProperty;
var __decorateClass3 = (decorators, target, key, kind) => {
  var result = void 0;
  for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
    if (decorator = decorators[i7])
      result = decorator(target, key, result) || result;
  if (result) __defProp3(target, key, result);
  return result;
};
function decideRowActionsFit(input) {
  const { containerWidth, contentWidth, collapsed, decidedAtWidth } = input;
  if (!(containerWidth > 0)) return { collapsed, decidedAtWidth };
  if (containerWidth !== decidedAtWidth) {
    if (collapsed) return { collapsed: false, decidedAtWidth: containerWidth };
    return { collapsed: contentWidth > containerWidth, decidedAtWidth: containerWidth };
  }
  if (!collapsed && contentWidth > containerWidth) return { collapsed: true, decidedAtWidth };
  return { collapsed, decidedAtWidth };
}
var DEFAULT_LABELS2 = {
  search: "Search\u2026",
  empty: "No results",
  filters: "Filters",
  clear: "Clear",
  apply: "Apply",
  selected: "{n} selected",
  importCsv: "Import CSV",
  exportCsv: "Export CSV",
  add: "Add",
  moreActions: "More actions",
  rowsPerPage: "Rows per page",
  perPageShort: "{n} / page",
  viewList: "View as list",
  viewCards: "View as cards",
  columnsVisible: "Visible columns",
  columns: "Columns",
  actions: "Actions",
  close: "Close",
  newRecord: "New",
  form: "Form",
  filterPlaceholder: "Filter\u2026",
  from: "From",
  to: "To",
  fromOf: "{label} from",
  toOf: "{label} to",
  gte: "\u2265",
  lte: "\u2264",
  noValues: "No values",
  selectAll: "Select all",
  selectRow: "Select row",
  select: "Select",
  showing: "Showing {from}\u2013{to} of",
  recordSingular: "record",
  recordPlural: "records",
  loadMore: "Load more"
};
var ES_LABELS = {
  search: "Buscar\u2026",
  empty: "Sin resultados",
  filters: "Filtros",
  clear: "Limpiar",
  apply: "Aplicar",
  selected: "{n} seleccionados",
  importCsv: "Importar CSV",
  exportCsv: "Exportar CSV",
  add: "A\xF1adir",
  moreActions: "M\xE1s acciones",
  rowsPerPage: "Filas por p\xE1gina",
  perPageShort: "{n} / p\xE1g.",
  viewList: "Vista lista",
  viewCards: "Vista tarjetas",
  columnsVisible: "Columnas visibles",
  columns: "Columnas",
  actions: "Acciones",
  close: "Cerrar",
  newRecord: "Nuevo",
  form: "Formulario",
  filterPlaceholder: "Filtrar\u2026",
  from: "Desde",
  to: "Hasta",
  fromOf: "{label} desde",
  toOf: "{label} hasta",
  gte: "\u2265",
  lte: "\u2264",
  noValues: "Sin valores",
  selectAll: "Seleccionar todo",
  selectRow: "Seleccionar fila",
  select: "Seleccionar",
  showing: "Mostrando {from}\u2013{to} de",
  recordSingular: "registro",
  recordPlural: "registros",
  loadMore: "Cargar m\xE1s"
};
var _OkDataTable = class _OkDataTable2 extends i3 {
  constructor() {
    super(...arguments);
    this.columns = [];
    this.rows = [];
    this.searchKeys = [];
    this.rowKeyField = "id";
    this.pageSize = 10;
    this.labels = {};
    this.actions = [];
    this.addable = false;
    this.pageSizeOptions = [10, 25, 50, 100];
    this.fill = false;
    this.columnPicker = true;
    this.csv = false;
    this.csvName = "export.csv";
    this.serverSide = false;
    this.total = 0;
    this.page = 0;
    this.searchable = false;
    this.sortDir = "asc";
    this.filterValues = {};
    this.title = "";
    this.views = false;
    this.exportable = false;
    this.importable = false;
    this.columnSelector = false;
    this.rowClickable = false;
    this.selectable = false;
    this.inlineFilters = false;
    this.menuActions = [];
    this.q = "";
    this.clientPage = 0;
    this.clientPageSize = 0;
    this.mobileShown = 0;
    this.clientSort = "";
    this.clientSortDir = "asc";
    this.clientFilters = {};
    this.filterDraft = {};
    this.serverFilters = {};
    this.panel = "none";
    this.viewMode = "table";
    this.viewChosenByUser = false;
    this.isMobile = false;
    this.xOverflow = false;
    this.actionsTrackPx = 0;
    this.rowActionsCollapsed = false;
    this.fitDecidedAtWidth = -1;
    this.rowMenuOpen = false;
    this.hiddenKeys = /* @__PURE__ */ new Set();
    this.internalSelection = /* @__PURE__ */ new Set();
    this.menuOpen = false;
    this.onLocaleChanged = () => this.requestUpdate();
    this.onWindowResize = () => {
      this.measureXOverflow();
      this.measureRowActionsFit();
    };
    this.onSearch = (ev) => {
      const value = ev.target.value ?? "";
      if (this.serverSide) {
        this.q = value;
        this.emit("searchChange", value);
      } else {
        this.q = value;
        this.clientPage = 0;
        this.mobileShown = 0;
      }
    };
  }
  static {
    this.styles = i`
    :host {
      /* Vars overridable (estilo Ionic), default = cadena --ok-* → --ion-* → hex */
      --background: var(--ok-surface, var(--ion-card-background, var(--ion-background-color, #ffffff)));
      --color: var(--ok-text, var(--ion-text-color, #1c1b17));
      --color-muted: var(--ok-muted, var(--ion-color-medium, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.55)));
      --border-color: var(--ok-border, var(--ion-color-step-150, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.12)));
      --border-color-soft: var(--ok-border-soft, var(--ion-color-step-100, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.07)));
      /* Borde más marcado para los controles de la toolbar (selects/pastilla de fechas), para que se
       * distingan como controles en claro y oscuro aunque el lienzo y la superficie casi no contrasten. */
      --control-border: color-mix(in srgb, var(--color) 22%, transparent);
      /* Relieve de cabecera/pie: step-100 (definido en claro y oscuro) → contraste con el lienzo. */
      --header-background: var(--ok-surface-2, var(--ion-color-step-100, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.04)));
      --row-hover: var(--ok-row-hover, var(--ion-color-step-50, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.03)));
      --primary: var(--ok-primary, var(--ion-color-primary, #3880ff));
      --primary-contrast: var(--ok-primary-contrast, var(--ion-color-primary-contrast, #ffffff));
      --border-radius: var(--ok-radius, 16px);
      --font: var(--ok-font, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif);

      display: block;
      color: var(--color);
      font-family: var(--font);
    }
    * { box-sizing: border-box; }
    .card {
      position: relative;
      display: flex;
      flex-direction: column;
      /* Flat: sin borde ni elevación (directiva 2026-06-09). */
      border: 0;
      border-radius: var(--border-radius);
      overflow: hidden;
      background: var(--background);
      box-shadow: none;
    }

    /* Panel lateral derecho (drawer) DENTRO de la tabla: filtros / alta-edición. Base (sin media):
       overlay absoluto — es lo que había hasta #75 y lo que ve un navegador sin media queries. */
    .tk-scrim { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.18); z-index: 19; }
    .drawer { position: absolute; top: 0; right: 0; height: 100%; width: 340px; max-width: 88%;
      background: var(--background); border-left: 1px solid var(--border-color);
      display: flex; flex-direction: column; z-index: 20;
      animation: tk-slide-in 0.18s ease; }
    @keyframes tk-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
    /* #75 — El panel EMPUJA en escritorio y es HOJA COMPLETA en móvil; nunca tapa a medias.
       Medido en el hub (Servicios/Citas): a 1440 el overlay de 340px se pintaba ENCIMA de
       «Duración», «Acciones» y el selector de columnas, con el 90% de la tabla vacío a la
       izquierda; a 390 dejaba una tira de 45px de tabla (media lupa, medio «Co…») que hacía
       parecer el formulario un pop-up mal puesto. Square Dashboard reduce la tabla con un panel
       fijo; Fresha/Shopify/Odoo abren una hoja a pantalla completa en móvil.
       ≥ 834px: mientras hay panel, .card pasa a rejilla de DOS columnas (tabla | panel 360px):
       la tabla se estrecha (ya sabe hacer scroll-x, #67) y nada queda tapado. */
    @media (min-width: 834px) {
      .card.has-panel { display: grid; grid-template-columns: minmax(0, 1fr) 360px; grid-template-rows: auto minmax(0, 1fr) auto; }
      .card.has-panel > .bar { grid-column: 1; grid-row: 1; }
      .card.has-panel > .scroll, .card.has-panel > .cards-grid, .card.has-panel > .empty { grid-column: 1; grid-row: 2; min-height: 0; overflow: auto; }
      .card.has-panel > .pager { grid-column: 1; grid-row: 3; }
      .card.has-panel > .drawer { position: static; grid-column: 2; grid-row: 1 / -1; width: auto; max-width: none; height: auto; min-height: 0; animation: none; }
      .card.has-panel > .tk-scrim { display: none; }
    }
    /* < 834px: hoja a pantalla completa con su cabecera (título + Cerrar); sin tira residual.
       position:fixed dentro de ion-content se ancla al área de contenido (contain), que es justo el hueco
       bajo la cabecera de la app: el usuario conserva el título de la página. */
    @media (max-width: 833.98px) {
      .drawer { position: fixed; inset: 0; top: var(--ok-sheet-top, 0px); width: 100%; max-width: none; height: auto; border-left: 0; z-index: 1000; }
      .tk-scrim { display: none; }
    }
    .drawer .dh { flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between;
      padding: 0.6rem 0.5rem 0.6rem 1rem; border-bottom: 1px solid var(--border-color); font-size: 1rem; }
    .drawer .db { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.85rem; }
    .fblock { display: flex; flex-direction: column; gap: 0.45rem; }
    .flabel { font-size: 13px; font-weight: 500; color: var(--color); }
    .frange { display: flex; gap: 0.5rem; }
    /* Filtros cliente: multi-select con ion-select (ventana flotante de Ionic) + rango de fechas. */
    .daterange { display: flex; gap: 0.6rem; }
    .daterange ion-input { flex: 1; }
    /* Pie del drawer de filtros: Limpiar / Aplicar. */
    .df { flex: 0 0 auto; display: flex; align-items: center; justify-content: flex-end; gap: 0.4rem; padding: 0.6rem 0.85rem; border-top: 1px solid var(--border-color); }
    .df .df-clear { margin-right: auto; }

    /* Modo fill: la tabla ocupa el alto del contenedor; filas con scroll interno; pager fijo. */
    :host([fill]) { display: flex; flex-direction: column; height: 100%; min-height: 0; }
    :host([fill]) .card { flex: 1 1 auto; min-height: 0; }
    :host([fill]) .bar, :host([fill]) .panel, :host([fill]) .pager { flex: 0 0 auto; }
    :host([fill]) .scroll, :host([fill]) .cards-grid { flex: 1 1 auto; min-height: 0; overflow: auto; }
    /* Sin filas, renderTable/renderCards devuelven SOLO el bloque .empty (sin .scroll). En modo
       fill hay que estirarlo para que ocupe el hueco entre toolbar y pager y centre su contenido
       (icono + mensaje) en vertical; si no, queda pegado arriba con el pager a media altura. */
    :host([fill]) .empty { flex: 1 1 auto; min-height: 0; }

    /* ── Topbar / cabecera (relieve) ─────────────────────────────────────────────────────── */
    .bar { display: flex; flex-direction: column; gap: 0.6rem; padding: 0.65rem 1rem; border-bottom: 1px solid var(--border-color); background: var(--header-background); }
    /* Toolbar CONSOLIDADA: TODOS los controles son hijos directos de UNA sola fila flex que
     * envuelve ELEMENTO A ELEMENTO (no por bloques): caben en una línea → una línea; los que no
     * caben bajan a la(s) línea(s) que hagan falta. El cluster derecho se empuja al borde con
     * .tk-spacer (hueco flexible) solo cuando todo cabe en una línea; al envolver, el spacer se
     * oculta y todo se apila a la izquierda.
     * ORDEN CANÓNICO (2026-06-22, izquierda→derecha): [buscador] · [filtros en línea] · ‹spacer› ·
     * [SELECTORES: columnas → filas/página] · [BOTONES: vistas → filtros(funnel) → import → export →
     * alta → ⋮ → acción primaria]. Es decir: buscador al inicio, filtros en medio, y al final los
     * selectores (columnas, luego «N por página») seguidos de los botones de acción. */
    .bar-main { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
    .bar-main > ion-button { --padding-start: 0.5rem; --padding-end: 0.5rem; margin: 0; }
    /* Spacer que absorbe el hueco libre en pantallas anchas (empuja el cluster derecho al borde).
     * Se oculta por debajo de 1024px para que, al envolver, los controles se apilen a la izquierda. */
    .tk-spacer { flex: 1 1 0; min-width: 0; align-self: stretch; }
    @media (max-width: 1024px) { .tk-spacer { display: none; } }
    /* Buscador a ancho completo (línea propia) en móvil; el resto envuelve debajo. */
    @media (max-width: 640px) { .search { flex-basis: 100%; max-width: none; } }
    .title-wrap { display: flex; align-items: baseline; gap: 0.5rem; }
    .title { font-size: 15px; font-weight: 600; line-height: 1; margin: 0; }
    .title-count { font-size: 12px; font-weight: 500; color: var(--color-muted); }

    /* Botón de herramienta cuadrado (filtros/import/export), look del Hub: 36×36, badge contador. */
    .toolbtn { position: relative; --padding-start: 0; --padding-end: 0; --border-radius: 10px; width: 36px; height: 36px; margin: 0; }
    .toolbtn .badge { position: absolute; top: -5px; right: -5px; min-width: 16px; height: 16px; padding: 0 3px; border-radius: 999px; background: var(--primary); color: var(--primary-contrast); font-size: 10px; font-weight: 700; line-height: 16px; text-align: center; pointer-events: none; }

    /* Buscador (caja con icono + limpiar), look del Hub. No crece (el spacer se queda el hueco);
     * puede encoger hasta min-width y, por debajo, envuelve. */
    .search { flex: 0 1 22rem; min-width: 12rem; max-width: 24rem; }
    ion-searchbar { --background: var(--background); --border-radius: 10px; padding: 0; min-height: 36px; }
    /* Flat: el buscador quita borde y elevación vía la clase específica de Ionic 'ion-no-border'.
     * (La regla global de Ionic para .ion-no-border no cruza el Shadow DOM, así que la
     * reimplementamos aquí dentro: --box-shadow controla la elevación; ::part(native) el borde.) */
    ion-searchbar.ion-no-border { --box-shadow: none; }
    ion-searchbar.ion-no-border::part(native) { border: none; box-shadow: none; }

    /* Toggle de vista lista/tarjetas (segmento) */
    .viewseg { display: inline-flex; align-items: center; gap: 2px; padding: 2px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--background); }
    .viewseg ion-button { --border-radius: 7px; }

    /* Botón primario (primaryAction) */
    .primary-btn { --background: var(--primary); --color: var(--primary-contrast); }
    /* #76 — El alta en MÓVIL: botón primario CON etiqueta y área táctil de 44px, en vez del «+»
       icónico de 36px al final de la barra. Fresha/Square/Shopify POS ponen la acción primaria
       de la lista como botón visible con texto (o FAB), nunca como icono anónimo.
       #113 — Y en ESCRITORIO igual: Odoo («New»), Business Central, Shopify («Add product»),
       WooCommerce, Lightspeed y Fresha rotulan y rellenan la acción principal de un listado; NN/g
       reserva el botón sin rótulo para lo universal (buscar, cerrar). Aquí solo cambia la ALTURA:
       36px para alinear con .toolbtn y el buscador, y los 44px táctiles vuelven abajo con el
       resto de objetivos de puntero grueso. */
    .add-btn { min-height: 36px; --border-radius: 10px; --padding-start: 0.9rem; --padding-end: 1rem; margin: 0; font-weight: 600; }
    .add-btn ion-icon { margin-inline-end: 0.35rem; }

    /* Selects de la toolbar: fondo + borde visibles (como el buscador y la pastilla de fechas) para
     * que se distingan como controles en claro y oscuro (sin fondo eran invisibles en dark). */
    .tk-cols { min-width: 6.5rem; max-width: 9rem; min-height: 38px; font-size: 13px; background: var(--background); color: var(--color); border: 1px solid var(--control-border); border-radius: 10px; --padding-start: 0.6rem; --padding-end: 0.4rem; --padding-top: 0.3rem; --padding-bottom: 0.3rem; }
    .vsep { width: 1px; align-self: stretch; background: var(--border-color); margin: 0.3rem 0.25rem; }

    /* Selector de filas/página en la toolbar (consolidado) */
    /* max-width: ion-select es display:block (sin core.css el host estira a la
     * línea entera cuando .bar-end hace wrap) — se capa como .tk-cols. */
    .tk-psize { min-width: 4.25rem; max-width: 5.5rem; min-height: 38px; font-size: 13px; background: var(--background); color: var(--color); border: 1px solid var(--control-border); border-radius: 10px; --padding-start: 0.6rem; --padding-end: 0.4rem; --padding-top: 0.35rem; --padding-bottom: 0.35rem; }

    /* Filtros EN LÍNEA en la toolbar (select / rango de fechas) */
    .tk-filter { min-width: 8.5rem; max-width: 13rem; min-height: 38px; font-size: 13px; background: var(--background); color: var(--color); border: 1px solid var(--control-border); border-radius: 10px; --padding-start: 0.7rem; --padding-end: 0.5rem; --padding-top: 0.35rem; --padding-bottom: 0.35rem; }
    .tk-daterange { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.3rem 0.6rem; min-height: 38px; border: 1px solid var(--control-border); border-radius: 10px; background: var(--background); color: var(--color-muted); font-size: 13px; }
    .tk-daterange ion-icon { font-size: 15px; flex: 0 0 auto; }
    .tk-daterange ion-input { --background: transparent; --padding-start: 0; --padding-end: 0; --padding-top: 2px; --padding-bottom: 2px; --color: var(--color); min-height: 26px; width: 6.8rem; font-size: 13px; }
    .tk-daterange .arr { color: var(--color-muted); }

    /* Barra contextual de selección */
    .selbar { display: flex; align-items: center; gap: 0.6rem; padding: 0.4rem 0.7rem; border-radius: 10px;
      font-size: 13px; color: var(--primary);
      background: color-mix(in srgb, var(--primary) 12%, transparent); }
    .selbar .sel-clear { margin-left: auto; display: inline-flex; align-items: center; gap: 0.25rem; cursor: pointer; font-weight: 500; color: inherit; background: none; border: 0; font: inherit; }
    .selbar .sel-clear:hover { text-decoration: underline; }

    /* Acordeones (alta / filtros en modo tarjetas) */
    .panel { padding: 0.85rem 1rem; border-bottom: 1px solid var(--border-color); background: var(--header-background); }
    .filters-panel { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.6rem; }

    /* ── Vista lista en CSS GRID (no <table>): permite ancho por columna ──────────────────── */
    /* #67 — La barra horizontal es PERMANENTE cuando hay desbordamiento: la overlay de macOS se
       esconde a los pocos ms y deja la tabla sin ninguna pista de que sigue a la derecha. Al
       declarar ::-webkit-scrollbar el navegador pinta la clásica, que ocupa sitio y se ve. */
    .scroll { overflow-x: auto; }
    .scroll::-webkit-scrollbar { height: 10px; }
    .scroll::-webkit-scrollbar-track { background: transparent; }
    .scroll::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--color) 25%, transparent); border-radius: 6px; }
    .scroll::-webkit-scrollbar-thumb:hover { background: color-mix(in srgb, var(--color) 40%, transparent); }
    /* #120 - The grid floor is the SUM OF THE COLUMN MINIMUMS (min-content), not its maximum
       size. With max-content the grid sizes itself to what the widest column asks for and, in
       doing so, every 1fr track ends up as wide AS THAT ONE: at 834px each column measured
       148.86px for content asking between 10px (a "4") and 100px ("Familia Perez"). The table
       always overflowed and the pinned actions column sat on top of Pax and Estado. With
       min-content the grid fits its container as long as the minimums fit, and 1fr shares out the
       leftover space; horizontal scroll shows up only when not even the minimums fit. */
    .grid { min-width: min-content; font-size: 14px; }
    .grow { display: grid; align-items: center; gap: 0.5rem; padding: 0 1rem; }
    .ghead { position: sticky; top: 0; z-index: 2; border-bottom: 1px solid var(--border-color);
      background: var(--header-background); padding-top: 0.55rem; padding-bottom: 0.55rem; }
    .gcell { display: flex; align-items: center; min-width: 0; }
    .gcell > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .gcell.right { justify-content: flex-end; text-align: right; }
    .gcell.center { justify-content: center; text-align: center; }
    /* #67 - PINNED ACTIONS COLUMN. When the grid overflows (since #120 only when not even the
       column minimums fit; before that it happened with six columns and room to spare) the button
       that opens the record went off screen: at 1440px it sat 335px past the edge with nothing to
       give it away. It stays stuck to the right edge, like Zendesk/Freshdesk/Shopify. With
       background:inherit it takes the row background (which is opaque for this very reason), so it
       keeps hover and selection without anything showing through. */
    .gcell.actions-col { position: sticky; right: 0; z-index: 1; background: inherit;
      margin-right: -1rem; padding-right: 1rem; }
    /* La sombra solo aparece cuando de verdad hay algo escondido a la izquierda (clase x-overflow);
       si la tabla cabe entera no se pinta nada. */
    .scroll.x-overflow .gcell.actions-col { box-shadow: -10px 0 10px -10px color-mix(in srgb, var(--color) 45%, transparent); }
    /* #120 - The pinned header has to be OPAQUE. background:inherit took --header-background,
       which is a 4% alpha TINT (measured rgba(24,24,27,0.04)): when the grid overflows the
       "Acciones" header went see-through and "PAX" and "ESTADO" could be read through it - the
       "PAXCIONESTAD" of the issue. It now sits on the opaque table background with the tint laid
       back on top, the same way .grow-data:hover does. */
    .ghead .gcell.actions-col { z-index: 3;
      background: linear-gradient(var(--header-background), var(--header-background)), var(--background); }
    .gh { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted); }
    .gh.sortable { cursor: pointer; user-select: none; white-space: nowrap; transition: background-color var(--ok-transition, 150ms ease), color var(--ok-transition, 150ms ease), box-shadow var(--ok-transition, 150ms ease), transform 120ms ease; }
    @media (hover: hover) {
      .gh.sortable:hover { color: var(--color); }
    }
    /* Caret de orden (3 estados, icono Ionic): neutral atenuado / activo en color primario. */
    .caret { display: inline-flex; align-items: center; margin-left: 0.25rem; flex: 0 0 auto; font-size: 13px; opacity: 0.3; }
    .caret.on { opacity: 1; color: var(--primary); }
    .grow-data { background: var(--background); border-bottom: 1px solid var(--border-color-soft); padding-top: 0.6rem; padding-bottom: 0.6rem; transition: background-color var(--ok-transition, 150ms ease), color var(--ok-transition, 150ms ease), box-shadow var(--ok-transition, 150ms ease), transform 120ms ease; }
    .grow-data:last-child { border-bottom: 0; }
    @media (hover: hover) {
      .grow-data:hover { background: linear-gradient(var(--row-hover), var(--row-hover)), var(--background); }
    }
    .grow-data:active { transform: scale(0.995); }
    .grow-data.selected { background: linear-gradient(color-mix(in srgb, var(--primary) 10%, transparent), color-mix(in srgb, var(--primary) 10%, transparent)), var(--background); }
    /* #67 — Fila clicable (opt-in row-clickable): es lo primero que intenta el usuario y lo que
       hacen Odoo, Jira SM, Shopify o Square en sus listados. */
    .grow-data.clickable { cursor: pointer; }
    .grow-data.clickable:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }
    .selcb { display: flex; align-items: center; justify-content: center; }
    .filters-grow { padding-top: 0.4rem; padding-bottom: 0.6rem; }
    .filters-grow input, .filters-grow select { width: 100%; box-sizing: border-box; font: inherit; font-size: 13px; padding: 0.3rem 0.4rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--background); color: var(--color); }
    .range { display: flex; gap: 0.25rem; }

    /* ── Vista tarjetas ──────────────────────────────────────────────────────────────────── */
    /* Cada tarjeta mide SU contenido (no se estira al alto de la fila ni del contenedor):
       - grid-auto-rows: max-content → cada fila implícita = alto de su contenido. CLAVE: sin esto,
         en modo fill (grid de alto fijo + align-content:start) cuando las tarjetas no caben el
         navegador encoge los tracks de fila y las tarjetas se solapan.
       - align-content: start → empaqueta las filas arriba (no reparte el hueco sobrante estirando).
       - align-items: start → en una fila multi-columna cada tarjeta mide su propio contenido.
       En modo fill el grid es flex-child con overflow:auto → cuando las tarjetas no caben aparece el
       scroll DENTRO de la tabla (no crece hacia fuera). */
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 0.75rem; padding: 1rem; grid-auto-rows: max-content; align-content: start; align-items: start; }
    /* Tarjeta = ion-card NATIVO de Ionic: su fondo, radio, elevación y padding son los de Ionic y NO
       se sobrescriben. Aquí solo se ajusta lo que el contexto de rejilla exige (margin) y los huecos
       que Ionic no trae (cabecera en fila, filas clave-valor, barra de acciones, resalte de selección). */
    ion-card.rcard { margin: 0; } /* la rejilla aporta el gap → sin esto el margin por defecto de ion-card lo duplica */
    ion-card.rcard.selected { outline: 2px solid var(--primary); outline-offset: -2px; }
    /* #74 — Tarjeta clicable (opt-in row-clickable): la mitad de #67 que faltaba. La vista de
       tarjetas es la que la tabla elige SOLA en móvil, así que sin esto el registro no se podía
       abrir desde un teléfono (medido con combos 0.1.4: 0 rowClick a 390px). */
    ion-card.rcard.clickable { cursor: pointer; }
    ion-card.rcard.clickable:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }
    @media (prefers-reduced-motion: reduce) {
      .gh.sortable:hover, .gh.sortable:active,
      .grow-data:hover, .grow-data:active { transform: none; }
    }
    /* Header: ion-card-header as a single row (icon + title + checkbox), keeping Ionic's padding.
       #79 — flex-direction/flex-wrap are SPELLED OUT on purpose: in ios mode (the mode the Hub
       shell pins, ADR-0143) Ionic's own host CSS gives ion-card-header a column direction, so a
       rule that only sets display:flex inherits it and the three children stack on three lines.
       Under md the same rule looked right, which is why it shipped. */
    ion-card-header.rcard-head { display: flex; flex-direction: row; flex-wrap: nowrap; align-items: center; gap: 0.5rem; }
    .rcard-head .rc-icon { display: inline-flex; color: var(--primary); }
    .rcard-head .rc-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
    /* Cuerpo: ion-card-content (padding Ionic por defecto) con las filas clave-valor apiladas. */
    ion-card-content.rcard-body { display: flex; flex-direction: column; gap: 0.4rem; }
    .rrow { display: flex; justify-content: space-between; gap: 0.5rem; font-size: 13px; }
    .rrow .rk { color: var(--color-muted); }
    .rrow .rv { font-weight: 500; text-align: right; color: var(--color); }
    /* Barra de acciones (Ionic no trae "card actions"): pie alineado a la derecha, fondo transparente. */
    .ractions { display: flex; justify-content: flex-end; gap: 0.25rem; padding: 0 0.5rem 0.5rem; }
    /* ERPlora/appointments#154 - a card's action row must NEVER clip.
       The assumption was that they always fit across the card. With the eight actions an
       appointment carries they do not: on a 411dp phone the card leaves 363px and the buttons ask
       for 380px (8 x 44px of tap floor + 7 gaps of 4px). Without wrapping, justify-content:
       flex-end takes that difference off the START side, so the FIRST button - Cobrar - hung off
       the left edge of the card, clipped, with no scrollbar and nothing to say it was there.
       The wrap is scoped to the card on purpose: the LIST view's row is measured by its
       scrollWidth to pin the column track (#121), and a row that wraps changes width with the
       track it is measured against, which is the loop that measure avoids. */
    .ractions .actions { flex-wrap: wrap; }

    /* ── Estado vacío ────────────────────────────────────────────────────────────────────── */
    .empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; padding: 3.5rem 1rem; text-align: center; color: var(--color-muted); }
    .empty .empty-ic { display: grid; place-items: center; width: 3.25rem; height: 3.25rem; border-radius: 999px; background: var(--header-background); font-size: 26px; }

    .actions { display: flex; gap: 0.25rem; justify-content: flex-end; }
    /* #121 - The buttons NEVER shrink. Their track is pinned to the width measured here
       (the scrollWidth of .actions); if they could shrink, a narrow track would shrink the
       measurement, which would shrink the track again. flex: 0 0 auto is what makes the
       measurement a property of the CONTENT instead of a property of the current layout. */
    .actions ion-button { flex: 0 0 auto; }
    /* #122 - Header of the actions column while the buttons are folded into the menu. "ACCIONES"
       measures 62.83px and the folded track is 44px: painted, it spills out of its own cell and
       over "Estado" - the very thing the issue is about. The column keeps its name for assistive
       tech and paints nothing. */
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
      clip-path: inset(50%); white-space: nowrap; border: 0; }
    /* Las acciones de fila son icon-only y de tamaño small en escritorio. En tablet/móvil se
     * amplía el host completo (no solo el icono) para que el área táctil alcance 44×44 px. */
    @media (pointer: coarse), (max-width: 834px) {
      .actions ion-button { min-width: 44px; min-height: 44px; margin: 0; }
      .toolbtn { width: 44px; height: 44px; }
      .add-btn { min-height: 44px; }
      .pager .nav ion-button { min-width: 44px; min-height: 44px; margin: 0; }
    }
    /* Spinner de acción en curso (loading): contenido dentro del ion-button small (Ionic lo fija
     * a 28px en el :host, por eso width/height y no font-size). Cubre tabla y tarjetas: los
     * botones de fila siempre van dentro de .actions. */
    .actions ion-spinner { width: 18px; height: 18px; }

    /* ── Pie: contador + paginación ──────────────────────────────────────────────────────── */
    .pager { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.55rem 1rem; border-top: 1px solid var(--border-color); background: var(--header-background); font-size: 12.5px; color: var(--color-muted); }
    .pager .left { display: flex; align-items: center; gap: 0.6rem; }
    .pager .strong { font-weight: 600; color: var(--color); }
    .psize { font: inherit; font-size: 12.5px; padding: 0.2rem 0.35rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--background); color: var(--color); }
    .pager .nav { display: flex; align-items: center; gap: 0.2rem; }
    /* #78 — Pie en MÓVIL: un solo control «Cargar más» en lugar del pager numerado (Shopify
       IndexTable, Fresha, Square y Material hacen lo mismo: nadie pinta botones de página en un
       teléfono). Sin atributo fill: el sólido por defecto de Ionic es el único que pinta caja en
       modo ios (outfitkit#82 / ADR-0143). Los 44px son el área táctil mínima. */
    .pager .load-more { min-height: 44px; margin: 0; --padding-start: 1rem; --padding-end: 1rem; font-size: 13px; }
    .pager .nav .pp { font-weight: 600; color: var(--color); padding: 0 0.25rem; }
    /* Pager numerado: botón por página + «…» en los saltos (look del Hub). */
    /* #92 — min-width/height at 44px so a numbered page button matches the prev/next ion-button's
       own 44px tap target (line above): before this they were visibly smaller than their neighbors. */
    .pnum { min-width: var(--ok-tap-min, 44px); height: var(--ok-tap-min, 44px); padding: 0 0.4rem; border: 1px solid transparent; border-radius: 8px; background: none; font: inherit; font-size: 12.5px; font-weight: 600; color: var(--color); cursor: pointer; transition: background 0.12s, border-color 0.12s; }
    .pnum:hover { background: var(--row-hover); }
    .pnum.on { background: color-mix(in srgb, var(--primary) 14%, transparent); color: var(--primary); border-color: color-mix(in srgb, var(--primary) 40%, transparent); }
    .pgap { padding: 0 0.15rem; color: var(--color-muted); }
    ion-button { --box-shadow: none; }
  `;
  }
  static {
    this.MOBILE_BREAKPOINT = 640;
  }
  connectedCallback() {
    super.connectedCallback();
    if (typeof window !== "undefined") {
      window.addEventListener("erplora:locale-changed", this.onLocaleChanged);
      window.addEventListener("resize", this.onWindowResize);
    }
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      this.mq = window.matchMedia(`(max-width: ${_OkDataTable2.MOBILE_BREAKPOINT}px)`);
      this.isMobile = this.mq.matches;
      const handler = (e5) => {
        const matches = "matches" in e5 ? e5.matches : this.mq?.matches ?? false;
        if (this.isMobile === matches) return;
        this.isMobile = matches;
        if (matches && this.cardViewEnabled) this.viewMode = "cards";
        else if (!matches && this.viewMode === "cards") this.viewMode = "table";
      };
      this.mq.addEventListener("change", handler);
      this._mqHandler = handler;
    }
  }
  /** #67 — Recalcula si la vista lista desborda a lo ancho (`scrollWidth > clientWidth`).
   *
   * Se mide después de renderizar, que es cuando el navegador ya conoce los anchos, y solo se
   * escribe el estado si CAMBIA: asignarlo siempre reprogramaría un render en bucle. */
  measureXOverflow() {
    const scroll = this.renderRoot?.querySelector?.(".scroll");
    const overflow = !!scroll && scroll.scrollWidth > scroll.clientWidth;
    if (this.xOverflow !== overflow) this.xOverflow = overflow;
  }
  /** #121 — Ancho natural de los botones de acción de una fila, para clavar su pista en px.
   *
   * Se lee del `scrollWidth` de `.actions`, que es el ancho de SU CONTENIDO: como los botones
   * llevan `flex: 0 0 auto` nunca se encogen, así que la medida no depende de lo ancha que sea la
   * pista en ese momento. Eso es lo que la hace estable: clavar la pista al ancho natural no
   * cambia el ancho natural, así que la siguiente medida sale igual y no hay bucle. */
  measureActionsTrack() {
    if (!this.actions.length) {
      if (this.actionsTrackPx !== 0) this.actionsTrackPx = 0;
      return;
    }
    const el = this.renderRoot?.querySelector?.(".grow-data .gcell.actions-col .actions");
    const width = el ? Math.ceil(el.scrollWidth) : 0;
    if (width > 0 && width !== this.actionsTrackPx) this.actionsTrackPx = width;
  }
  /** #122 — Decide si los botones de acción de la fila caben o se pliegan en el menú «⋮».
   *  El criterio y la garantía de que no oscila viven en `decideRowActionsFit`. */
  measureRowActionsFit() {
    const scroll = this.renderRoot?.querySelector?.(".scroll");
    if (!scroll) return;
    const next = decideRowActionsFit({
      containerWidth: scroll.clientWidth,
      contentWidth: scroll.scrollWidth,
      collapsed: this.rowActionsCollapsed,
      decidedAtWidth: this.fitDecidedAtWidth
    });
    this.fitDecidedAtWidth = next.decidedAtWidth;
    if (this.rowActionsCollapsed !== next.collapsed) this.rowActionsCollapsed = next.collapsed;
  }
  /** Engancha el observador al contenedor de scroll del render actual (cambia entre vistas). */
  observeXOverflow() {
    if (typeof ResizeObserver === "undefined") return;
    const scroll = this.renderRoot?.querySelector?.(".scroll");
    if (!scroll) return;
    this.xObserver ??= new ResizeObserver(() => {
      this.measureXOverflow();
      this.measureActionsTrack();
      this.measureRowActionsFit();
    });
    this.xObserver.disconnect();
    this.xObserver.observe(scroll);
    const grid = scroll.querySelector(".grid");
    if (grid) this.xObserver.observe(grid);
  }
  updated(changed) {
    this.observeXOverflow();
    this.measureXOverflow();
    if (changed.has("columns") || changed.has("actions") || changed.has("hiddenKeys") || changed.has("selectable")) {
      this.fitDecidedAtWidth = -1;
    }
    this.measureActionsTrack();
    this.measureRowActionsFit();
    if (changed.has("panel")) this.syncSheetTop();
  }
  /** #75 — Where the mobile sheet starts. `position: fixed; inset: 0` painted it from y=0 and the
   *  app's `ion-header` (its own stacking context, above the content) covered the sheet's title and
   *  its only Close button — measured at 390×844 in the Appointments parity page. CSS inside a
   *  shadow root cannot know where the content area begins, so on open the table measures the
   *  closest `ion-content` (walking through shadow hosts) and hands the offset over as a custom
   *  property; on close it is removed. Without an `ion-content` around, the sheet keeps y=0. */
  syncSheetTop() {
    if (this.panel === "none") {
      this.style.removeProperty("--ok-sheet-top");
      return;
    }
    let node = this;
    let content = null;
    while (node && !content) {
      const parent = node.parentNode ?? node.getRootNode?.()?.host ?? null;
      if (parent && parent.nodeType === Node.ELEMENT_NODE && parent.tagName === "ION-CONTENT") content = parent;
      node = parent === node ? null : parent;
    }
    const top = content ? Math.max(0, Math.round(content.getBoundingClientRect().top)) : 0;
    this.style.setProperty("--ok-sheet-top", `${top}px`);
  }
  disconnectedCallback() {
    if (typeof window !== "undefined") {
      window.removeEventListener("erplora:locale-changed", this.onLocaleChanged);
      window.removeEventListener("resize", this.onWindowResize);
    }
    this.xObserver?.disconnect();
    this.xObserver = void 0;
    if (this.mq) {
      const handler = this._mqHandler;
      if (handler) this.mq.removeEventListener("change", handler);
      this.mq = void 0;
    }
    super.disconnectedCallback();
  }
  // ── i18n: idioma del documento ← overrides explícitos de `.labels` ─────────────────────────
  get t() {
    const lang = typeof document === "undefined" ? "en" : document.documentElement.lang.toLowerCase();
    return { ...lang.startsWith("es") ? ES_LABELS : DEFAULT_LABELS2, ...this.labels };
  }
  /** Placeholder efectivo del buscador (prop explícita → label i18n → default inglés). */
  get effSearchPlaceholder() {
    return this.searchPlaceholder ?? this.t.search;
  }
  /** Mensaje efectivo de estado vacío (prop explícita → label i18n → default inglés). */
  get effEmptyMessage() {
    return this.emptyMessage ?? this.t.empty;
  }
  // ── Resolución de alias (compat + documentados) ──────────────────────────────────────────
  get effPageSizes() {
    return this.pageSizes ?? this.pageSizeOptions;
  }
  get effColumnPicker() {
    return this.columnPicker || this.columnSelector;
  }
  get effExport() {
    return this.csv || this.exportable;
  }
  get effImport() {
    return this.csv || this.importable;
  }
  /** ¿Está habilitado el conmutador de vista lista/tarjetas? */
  get viewToggle() {
    if (Array.isArray(this.views)) return this.views.length > 1;
    return this.views === true;
  }
  /** ¿Está disponible la vista tarjetas? (presente en `views` o `views === true`). */
  get cardViewEnabled() {
    if (Array.isArray(this.views)) return this.views.some((v3) => v3 === "cards" || v3 === "card");
    return this.views === true;
  }
  /** Columnas actualmente visibles (respeta el column chooser). */
  get visibleColumns() {
    return this.hiddenKeys.size ? this.columns.filter((c5) => !this.hiddenKeys.has(c5.key)) : this.columns;
  }
  setVisibleColumns(keys) {
    const visible = new Set(keys);
    this.hiddenKeys = new Set(this.columns.map((c5) => c5.key).filter((k2) => !visible.has(k2)));
    this.emit("columnsChange", { visible: keys });
  }
  // ── Selección ─────────────────────────────────────────────────────────────────────────────
  keyOf(row) {
    if (typeof this.rowKey === "function") return String(this.rowKey(row) ?? "");
    if (typeof this.rowKey === "string") return String(row[this.rowKey] ?? "");
    return String(row[this.rowKeyField] ?? "");
  }
  /** #143 — `<prefix>-<suffix>`, or `nothing` (= the attribute is not painted) when the host gave
   *  no prefix. A blank prefix counts as absent: `" "` would leave dangling `-add` hooks, identical
   *  on every table of the screen, which is exactly what the prefix prevents. */
  tid(suffix) {
    const prefix = this.testid?.trim();
    return prefix ? `${prefix}-${suffix}` : A;
  }
  get selection() {
    return this.selectedKeys ?? this.internalSelection;
  }
  setSelection(next) {
    if (!this.selectedKeys) this.internalSelection = next;
    this.emit("selectionChange", { keys: [...next] });
    this.requestUpdate();
  }
  toggleRow(key) {
    const next = new Set(this.selection);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.setSelection(next);
  }
  toggleAll(visible) {
    const keys = visible.map((r6) => this.keyOf(r6));
    const allOn = keys.length > 0 && keys.every((k2) => this.selection.has(k2));
    const next = new Set(this.selection);
    if (allOn) keys.forEach((k2) => next.delete(k2));
    else keys.forEach((k2) => next.add(k2));
    this.setSelection(next);
  }
  // ── CSV ─────────────────────────────────────────────────────────────────────────────────────
  csvEscape(v3) {
    const s5 = v3 === null || v3 === void 0 ? "" : String(v3);
    return /[",\n\r]/.test(s5) ? `"${s5.replace(/"/g, '""')}"` : s5;
  }
  /** Exporta las filas a CSV (cabeceras = column.key). Si no hay filas, exporta solo la estructura. */
  exportCsv() {
    const cols = this.columns;
    const head = cols.map((c5) => this.csvEscape(c5.key)).join(",");
    const lines = this.rows.map((r6) => cols.map((c5) => this.csvEscape(r6[c5.key])).join(","));
    const csv = [head, ...lines].join("\r\n");
    const blob = new Blob([CSV_BOM + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a3 = document.createElement("a");
    a3.href = url;
    a3.download = this.csvName;
    a3.click();
    URL.revokeObjectURL(url);
    this.emit("csvExport", { rows: this.rows.length });
    this.emit("export", { rows: this.rows.length });
  }
  parseCsv(text) {
    const out = [];
    let row = [];
    let field = "";
    let q = false;
    for (let i7 = 0; i7 < text.length; i7++) {
      const c5 = text[i7];
      if (q) {
        if (c5 === '"') {
          if (text[i7 + 1] === '"') {
            field += '"';
            i7++;
          } else q = false;
        } else field += c5;
      } else if (c5 === '"') q = true;
      else if (c5 === ",") {
        row.push(field);
        field = "";
      } else if (c5 === "\n" || c5 === "\r") {
        if (c5 === "\r" && text[i7 + 1] === "\n") i7++;
        row.push(field);
        field = "";
        if (row.length > 1 || row[0] !== "") out.push(row);
        row = [];
      } else field += c5;
    }
    if (field !== "" || row.length) {
      row.push(field);
      out.push(row);
    }
    const headers = out.shift() ?? [];
    const rows = out.map((r6) => Object.fromEntries(headers.map((h4, i7) => [h4, r6[i7] ?? ""])));
    return { headers, rows };
  }
  async onImportFile(ev) {
    const input = ev.target;
    const file = input.files?.[0];
    if (!file) return;
    const text = decodeCsvBuffer(await file.arrayBuffer());
    const { headers, rows } = this.parseCsv(text);
    this.emit("csvImport", { headers, rows });
    this.emit("import", { headers, rows });
    input.value = "";
  }
  toggle(p4) {
    if (p4 === "filters" && this.panel !== "filters") {
      this.filterDraft = this.cloneFilters(this.clientFilters);
    }
    this.panel = this.panel === p4 ? "none" : p4;
  }
  // ── Filtros en memoria (modo cliente): borrador → aplicar. ───────────────────────────────────
  cloneFilters(src) {
    const out = {};
    for (const [k2, f3] of Object.entries(src)) {
      out[k2] = { values: f3.values ? new Set(f3.values) : void 0, from: f3.from, to: f3.to };
    }
    return out;
  }
  // Fija el conjunto de valores seleccionados de una columna (multi-select del drawer = ion-select).
  setFilterValues(key, values) {
    const next = this.cloneFilters(this.filterDraft);
    const clean = (values ?? []).filter((v3) => v3 != null && v3 !== "");
    if (clean.length) next[key] = { ...next[key], values: new Set(clean) };
    else next[key] = { ...next[key], values: void 0 };
    this.filterDraft = next;
  }
  setFilterRange(key, edge, value) {
    const next = this.cloneFilters(this.filterDraft);
    next[key] = { ...next[key], [edge]: value };
    this.filterDraft = next;
  }
  applyFilters() {
    const clean = {};
    for (const [k2, f3] of Object.entries(this.filterDraft)) {
      if (f3.values && f3.values.size > 0 || f3.from || f3.to) clean[k2] = f3;
    }
    this.clientFilters = clean;
    this.clientPage = 0;
    this.mobileShown = 0;
    this.panel = "none";
    this.emit("filterChange", { filters: this.serializeFilters(clean) });
  }
  clearFilters() {
    this.filterDraft = {};
  }
  serializeFilters(src) {
    const out = {};
    for (const [k2, f3] of Object.entries(src)) {
      if (f3.values && f3.values.size > 0) out[k2] = [...f3.values];
      else if (f3.from || f3.to) out[k2] = { from: f3.from ?? "", to: f3.to ?? "" };
    }
    return out;
  }
  /** Abre el panel lateral (API pública para el módulo, p.ej. "editar" abre el form pre-rellenado). */
  open(panel = "create") {
    this.panel = panel;
  }
  /** Cierra el panel lateral. */
  close() {
    this.panel = "none";
  }
  emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
  get hasSearch() {
    return this.searchable || this.searchKeys.length > 0;
  }
  /** Columnas filtrables (con control en el panel de filtros). En cliente y en servidor. */
  get filterColumns() {
    return this.columns.filter((c5) => c5.filterable);
  }
  /** ¿Hay que mostrar el botón de Filtros? (cualquier columna filtrable). */
  get hasFilterRow() {
    return this.filterColumns.length > 0;
  }
  /** Nº de filtros activos → badge del botón Filtros. En servidor cuenta `filterValues` (#106): sin
   *  esto el embudo no daba NINGUNA señal de que la lista venía acotada. */
  get activeFilterCount() {
    if (this.serverSide) {
      return Object.keys(this.serverFilters).filter((k2) => this.serverFilterState(k2) !== void 0).length;
    }
    return Object.values(this.clientFilters).filter(
      (f3) => f3.values && f3.values.size > 0 || f3.from || f3.to
    ).length;
  }
  // ── Estado de filtro VISIBLE (#106) ──────────────────────────────────────────────────────────
  /** Traduce un valor de `filterValues` (la forma que emite `filterChange`) a la forma interna que
   *  usan los `render*Filter`. `undefined` = ese filtro no está puesto. */
  serverFilterState(key) {
    const raw = this.serverFilters[key];
    if (raw === void 0 || raw === null || raw === "") return void 0;
    if (Array.isArray(raw)) {
      const values = raw.filter((v3) => v3 !== null && v3 !== void 0 && v3 !== "").map((v3) => String(v3));
      return values.length ? { values: new Set(values) } : void 0;
    }
    if (typeof raw === "object") {
      const range = raw;
      const from = range.from === null || range.from === void 0 || range.from === "" ? void 0 : String(range.from);
      const to = range.to === null || range.to === void 0 || range.to === "" ? void 0 : String(range.to);
      return from !== void 0 || to !== void 0 ? { from, to } : void 0;
    }
    return { values: /* @__PURE__ */ new Set([String(raw)]) };
  }
  /** Estado de filtro efectivo de una columna: servidor → `filterValues`/espejo; cliente → memoria. */
  filterStateOf(key) {
    return this.serverSide ? this.serverFilterState(key) : this.clientFilters[key];
  }
  /** Fija (o borra) el valor visible de un filtro en el espejo de servidor. */
  setServerFilter(key, value) {
    const next = { ...this.serverFilters };
    const empty = value === void 0 || value === null || value === "" || Array.isArray(value) && value.length === 0;
    if (empty) delete next[key];
    else next[key] = value;
    this.serverFilters = next;
  }
  /** Fija UN extremo de un rango en el espejo. Los dos extremos viajan en eventos SEPARADOS
   *  (`{from}` y luego `{to}`), así que aquí se MEZCLA: reemplazar borraría el otro extremo. */
  setServerRangeEdge(key, edge, value) {
    const prev = this.serverFilters[key];
    const base = prev && typeof prev === "object" && !Array.isArray(prev) ? { ...prev } : {};
    base[edge] = value;
    const alive = (v3) => v3 !== void 0 && v3 !== null && v3 !== "";
    this.setServerFilter(key, alive(base.from) || alive(base.to) ? base : void 0);
  }
  /** Valor crudo de una columna para ordenar/filtrar (usa format si lo hay, si no row[key]). */
  rawValue(col, row) {
    if (col.format) return col.format(row);
    return row[col.key];
  }
  /** Valores distintos de una columna (para los chips del filtro multi-select). */
  distinctValues(col) {
    const set = /* @__PURE__ */ new Set();
    for (const row of this.rows) {
      const v3 = this.rawValue(col, row);
      if (v3 != null && v3 !== "") set.add(String(v3));
    }
    return [...set].sort((a3, b3) => a3.localeCompare(b3));
  }
  /** Filas tras buscar + filtrar + ordenar EN MEMORIA (solo modo cliente). */
  get clientFiltered() {
    let result = this.rows;
    const needle = this.q.trim().toLowerCase();
    if (needle && this.searchKeys.length) {
      result = result.filter(
        (r6) => this.searchKeys.some((k2) => String(r6[k2] ?? "").toLowerCase().includes(needle))
      );
    }
    const fkeys = Object.keys(this.clientFilters);
    if (fkeys.length) {
      result = result.filter(
        (row) => fkeys.every((key) => {
          const f3 = this.clientFilters[key];
          const col = this.columns.find((c5) => c5.key === key);
          if (!col) return true;
          if (f3.values && f3.values.size > 0) {
            return f3.values.has(String(this.rawValue(col, row) ?? ""));
          }
          if (f3.from || f3.to) {
            const raw = this.rawValue(col, row);
            const t5 = raw == null ? NaN : new Date(raw).getTime();
            const from = f3.from ? new Date(f3.from).getTime() : -Infinity;
            const to = f3.to ? new Date(f3.to).getTime() + 864e5 - 1 : Infinity;
            return !Number.isNaN(t5) && t5 >= from && t5 <= to;
          }
          return true;
        })
      );
    }
    if (this.clientSort) {
      const col = this.columns.find((c5) => c5.key === this.clientSort);
      if (col) {
        const dir = this.clientSortDir === "asc" ? 1 : -1;
        result = [...result].sort((a3, b3) => {
          const va = this.rawValue(col, a3);
          const vb = this.rawValue(col, b3);
          if (va == null) return 1;
          if (vb == null) return -1;
          if (va < vb) return -1 * dir;
          if (va > vb) return 1 * dir;
          return 0;
        });
      }
    }
    return result;
  }
  cell(col, row) {
    if (col.format) return col.format(row);
    const v3 = row[col.key];
    return v3 === null || v3 === void 0 ? "" : String(v3);
  }
  /** ¿Es ordenable la columna? Servidor: opt-in (`sortable`). Cliente: por defecto SÍ (como el Hub),
   *  salvo `sortable: false` explícito. */
  isSortable(col) {
    return this.serverSide ? !!col.sortable : col.sortable !== false;
  }
  onHeaderClick(col) {
    if (!this.isSortable(col)) return;
    if (this.serverSide) {
      const dir = this.sort === col.key && this.sortDir === "asc" ? "desc" : "asc";
      this.emit("sortChange", { sort: col.key, dir });
      return;
    }
    this.mobileShown = 0;
    if (this.clientSort === col.key) {
      this.clientSortDir = this.clientSortDir === "asc" ? "desc" : "asc";
    } else {
      this.clientSort = col.key;
      this.clientSortDir = "asc";
    }
  }
  onFilterInput(col, ev) {
    const value = ev.target.value ?? "";
    this.setServerFilter(col.key, value);
    this.emit("filterChange", { col: col.key, value });
  }
  onRangeInput(col, edge, ev) {
    const raw = ev.target.value ?? "";
    const v3 = raw === "" ? "" : Number(raw);
    this.setServerRangeEdge(col.key, edge, v3);
    this.emit("filterChange", { col: col.key, value: { [edge]: v3 } });
  }
  onDateRangeInput(col, edge, ev) {
    const v3 = ev.target.value ?? "";
    this.setServerRangeEdge(col.key, edge, v3);
    this.emit("filterChange", { col: col.key, value: { [edge]: v3 } });
  }
  // ── Filtros EN LÍNEA (toolbar) ────────────────────────────────────────────────────────────
  // En modo cliente escriben directamente `clientFilters` (filtran en memoria); en servidor solo
  // emiten `filterChange`. Reutilizan la misma forma de filtro que el drawer (values / from / to).
  setClientFilter(key, patch) {
    const next = { ...this.clientFilters };
    const merged = { ...next[key], ...patch };
    const empty = (!merged.values || merged.values.size === 0) && !merged.from && !merged.to;
    if (empty) delete next[key];
    else next[key] = merged;
    this.clientFilters = next;
    this.clientPage = 0;
    this.mobileShown = 0;
  }
  // ion-select (select/multiselect) del panel de filtros (renderFilterControl). En servidor emite
  // `filterChange`; en cliente escribe `clientFilters` (multiselect ⇒ filtra por inclusión).
  onFilterSelect(col, value, multi) {
    if (this.serverSide) {
      const next = value ?? (multi ? [] : "");
      this.setServerFilter(col.key, next);
      this.emit("filterChange", { col: col.key, value: next });
      return;
    }
    if (multi) {
      const arr = Array.isArray(value) ? value.map((v3) => String(v3)) : value != null && value !== "" ? [String(value)] : [];
      this.setClientFilter(col.key, { values: arr.length ? new Set(arr) : void 0 });
    } else {
      const v3 = String(value ?? "");
      this.setClientFilter(col.key, { values: v3 ? /* @__PURE__ */ new Set([v3]) : void 0 });
    }
  }
  onInlineRange(col, edge, ev) {
    const v3 = ev.target.value ?? "";
    if (this.serverSide) {
      this.setServerRangeEdge(col.key, edge, v3);
      this.emit("filterChange", { col: col.key, value: { [edge]: v3 } });
      return;
    }
    this.setClientFilter(col.key, { [edge]: v3 || void 0 });
  }
  // Menú overflow: ancla el popover al botón vía el evento de click (compatible con Shadow DOM).
  openMenu(ev) {
    this.menuEv = ev;
    this.menuOpen = true;
  }
  /** #122 — Abre el menú «⋮» de UNA fila. Un solo popover para toda la tabla (uno por fila serían
   *  tantos como filas), anclado por evento porque `trigger` no resuelve dentro de Shadow DOM. */
  openRowMenu(ev, row) {
    ev.stopPropagation();
    this.rowMenuEv = ev;
    this.rowMenuRow = row;
    this.rowMenuOpen = true;
  }
  /** #122 — Las mismas acciones de la fila, como lista. Respeta `disabled`/`loading` por fila: una
   *  acción que no se puede pulsar en su botón tampoco se puede pulsar aquí. */
  renderRowMenu() {
    const row = this.rowMenuRow;
    if (!this.actions.length || !row) return A;
    const key = this.keyOf(row);
    return b2`
      <ion-popover
        class="row-menu"
        .isOpen=${this.rowMenuOpen}
        .event=${this.rowMenuEv}
        dismiss-on-select="true"
        @didDismiss=${() => this.rowMenuOpen = false}
      >
        <ion-content>
          <ion-list lines="none">
            ${this.actions.map((a3) => {
      const disabled = a3.loading?.(row) === true || a3.disabled?.(row) === true;
      const label = typeof a3.label === "function" ? a3.label(row) : a3.label;
      return b2`
                <!-- #143 — The action is named the SAME collapsed or not, so one spec works at any
                     width. It carries the hook only while the direct buttons are NOT there: the
                     popover survives its dismissal («rowMenuRow» is not cleared), and if the table
                     widened again there would be TWO elements with the hook and «getByTestId»
                     would pick one at random. -->
                <ion-item
                  button
                  data-testid=${this.rowActionsCollapsed ? this.tid(`row-${key}-${a3.id}`) : A}
                  ?disabled=${disabled}
                  aria-disabled=${disabled ? "true" : A}
                  .detail=${false}
                  @click=${() => {
        if (disabled) return;
        this.rowMenuOpen = false;
        this.emit("rowAction", { actionId: a3.id, row });
      }}
                >
                  ${a3.icon ? b2`<ion-icon slot="start" .icon=${okIcon(a3.icon)} color=${a3.color ?? A}></ion-icon>` : A}
                  <ion-label color=${a3.color ?? A}>${label}</ion-label>
                </ion-item>
              `;
    })}
          </ion-list>
        </ion-content>
      </ion-popover>
    `;
  }
  // Aplica la vista inicial declarada (`default-view`) una sola vez, tras el primer render. Es la
  // forma robusta de arrancar en tarjetas sin depender de fijar `viewMode` por referencia (que
  // falla si la tabla monta detrás de un `v-if`/loading y el ref aún es null).
  firstUpdated() {
    this.applyInitialView();
  }
  /** Re-evalúa la vista inicial cada render mientras el usuario no haya elegido a mano.
   *
   * `firstUpdated` NO basta: decide una sola vez, y los consumidores que asignan las props por JS
   * DESPUÉS de insertar el elemento —lo normal en páginas renderizadas por el servidor— llegan
   * tarde. En ese momento `cardViewEnabled` aún era `false`, así que no se conmutaba; y el
   * listener de `matchMedia` solo dispara al CAMBIAR el viewport, cosa que en un móvil no pasa
   * nunca. La tabla se quedaba con scroll lateral para siempre.
   *
   * Medido en Android contra producción el 2026-08-02 con el bundle ya actualizado:
   *   `views` antes de insertar  → tarjetas
   *   `views` después de insertar → tabla   ← lo que hace la página
   */
  willUpdate(changed) {
    this.applyInitialView();
    if (changed.has("filterValues")) this.serverFilters = { ...this.filterValues ?? {} };
    if (changed.has("search") && this.search !== void 0) {
      this.q = this.search;
      if (!this.serverSide) {
        this.clientPage = 0;
        this.mobileShown = 0;
      }
    }
    if (!this.serverSide && changed.has("rows") && this.mobileShown !== 0) this.mobileShown = 0;
  }
  applyInitialView() {
    if (this.viewChosenByUser) return;
    if (this.isMobile && this.cardViewEnabled) {
      this.viewMode = "cards";
    } else if (this.defaultView === "cards" && this.cardViewEnabled) {
      this.viewMode = "cards";
    } else if (this.defaultView === "table") {
      this.viewMode = "table";
    }
  }
  setViewMode(mode) {
    this.viewChosenByUser = true;
    if (this.viewMode === mode) return;
    this.viewMode = mode;
    this.emit("viewChange", mode);
  }
  // Control de filtro de una columna, con componentes Ionic (mismos inputs que el form de alta).
  renderFilterControl(col) {
    if (!col.filterable) return A;
    const type = col.filterType ?? "text";
    const f3 = this.filterStateOf(col.key);
    if (type === "select" || type === "multiselect") {
      const multi = type === "multiselect";
      const opts = col.options ?? this.distinctValues(col).map((v3) => ({ value: v3, label: v3 }));
      const current = this.selectValue(f3, multi);
      return b2`
        <ion-select
          label=${col.header}
          label-placement="stacked"
          fill="outline" mode="md"
          ?multiple=${multi}
          interface="modal"
          .interfaceOptions=${{ cssClass: "ok-overlay" }}
          placeholder=${this.t.select}
          .value=${current}
          @ionChange=${(e5) => this.onFilterSelect(col, e5.detail.value, multi)}
        >
          ${multi ? A : b2`<ion-select-option value="">${this.t.select}</ion-select-option>`}
          ${opts.map((o7) => b2`<ion-select-option value=${o7.value}>${o7.label}</ion-select-option>`)}
        </ion-select>
      `;
    }
    if (type === "range" || type === "daterange") {
      const t5 = type === "daterange" ? "date" : "number";
      const onEdge = type === "daterange" ? this.onDateRangeInput.bind(this) : this.onRangeInput.bind(this);
      return b2`
        <div class="fblock">
          <span class="flabel">${col.header}</span>
          <div class="frange">
            <ion-input type=${t5} fill="outline" mode="md" placeholder=${type === "daterange" ? this.t.from : this.t.gte}
              .value=${f3?.from ?? ""}
              @ionInput=${(e5) => onEdge(col, "from", e5)}></ion-input>
            <ion-input type=${t5} fill="outline" mode="md" placeholder=${type === "daterange" ? this.t.to : this.t.lte}
              .value=${f3?.to ?? ""}
              @ionInput=${(e5) => onEdge(col, "to", e5)}></ion-input>
          </div>
        </div>
      `;
    }
    const inputType = type === "number" ? "number" : type === "date" ? "date" : "text";
    return b2`
      <ion-input
        type=${inputType}
        fill="outline" mode="md"
        label=${col.header}
        label-placement="stacked"
        placeholder=${this.t.filterPlaceholder}
        .value=${this.selectValue(f3, false)}
        @ionInput=${(e5) => this.onFilterInput(col, e5)}
      ></ion-input>
    `;
  }
  /** Valor para un control de un solo valor (`ion-select`/`ion-input`) o multi (`ion-select
   *  multiple`) a partir del estado de filtro interno. '' / [] = sin filtro. */
  selectValue(f3, multi) {
    const values = [...f3?.values ?? /* @__PURE__ */ new Set()];
    if (multi) return values;
    return values.length ? values[0] : "";
  }
  // Controles de filtro COMPACTOS para la toolbar (modo `inlineFilters`). Solo select y rango de
  // fechas (los del screenshot); el resto de tipos siguen disponibles vía el drawer si no se activa
  // `inlineFilters`. Look: «Todos los Estados» (placeholder) / «01/10/25 → 18/10/25».
  renderInlineFilters() {
    const cols = this.filterColumns.filter((c5) => {
      const t5 = c5.filterType ?? "text";
      return t5 === "select" || t5 === "multiselect" || t5 === "date" || t5 === "daterange";
    });
    if (!cols.length) return A;
    return b2`${cols.map((c5) => this.renderInlineFilter(c5))}`;
  }
  renderInlineFilter(col) {
    const type = col.filterType ?? "text";
    const f3 = this.filterStateOf(col.key);
    if (type === "select" || type === "multiselect") {
      const multi = type === "multiselect";
      const opts = col.options ?? this.distinctValues(col).map((v3) => ({ value: v3, label: v3 }));
      const current = this.selectValue(f3, multi);
      return b2`
        <ion-select
          class="tk-filter"
          ?multiple=${multi}
          interface="modal"
          .interfaceOptions=${{ cssClass: "ok-overlay" }}
          aria-label=${col.header}
          placeholder=${col.header}
          .value=${current}
          @ionChange=${(e5) => this.onFilterSelect(col, e5.detail.value, multi)}
        >
          ${multi ? A : b2`<ion-select-option value="">${col.header}</ion-select-option>`}
          ${opts.map((o7) => b2`<ion-select-option value=${o7.value}>${o7.label}</ion-select-option>`)}
        </ion-select>
      `;
    }
    return b2`
      <span class="tk-daterange" role="group" aria-label=${col.header}>
        <ion-icon .icon=${iconCalendarOutline}></ion-icon>
        <ion-input type="date" aria-label=${this.t.fromOf.replace("{label}", col.header)} .value=${f3?.from ?? ""} @ionChange=${(e5) => this.onInlineRange(col, "from", e5)}></ion-input>
        <span class="arr">→</span>
        <ion-input type="date" aria-label=${this.t.toOf.replace("{label}", col.header)} .value=${f3?.to ?? ""} @ionChange=${(e5) => this.onInlineRange(col, "to", e5)}></ion-input>
      </span>
    `;
  }
  // Menú overflow («⋮») con ion-popover anclado por evento (Shadow-DOM-safe).
  renderOverflowMenu() {
    if (!this.menuActions.length) return A;
    return b2`
      <ion-button class="toolbtn" fill="clear" aria-label=${this.t.moreActions} @click=${(e5) => this.openMenu(e5)}>
        <ion-icon slot="icon-only" .icon=${iconEllipsisVertical}></ion-icon>
      </ion-button>
      <ion-popover
        .isOpen=${this.menuOpen}
        .event=${this.menuEv}
        dismiss-on-select="true"
        @didDismiss=${() => this.menuOpen = false}
      >
        <ion-content>
          <ion-list lines="none">
            ${this.menuActions.map(
      (a3) => b2`
                <ion-item button .detail=${false} @click=${() => {
        this.menuOpen = false;
        this.emit("menuAction", { actionId: a3.id });
      }}>
                  ${a3.icon ? b2`<ion-icon slot="start" .icon=${okIcon(a3.icon)} color=${a3.color ?? A}></ion-icon>` : A}
                  <ion-label color=${a3.color ?? A}>${a3.label}</ion-label>
                </ion-item>
              `
    )}
          </ion-list>
        </ion-content>
      </ion-popover>
    `;
  }
  // Row action buttons, shared by the table and the card views.
  //
  // `collapsible` = the LIST view, the only one that folds its buttons into a "⋮" menu when the
  // columns leave it no width (#122). The CARD view does not fold; it WRAPS instead, see
  // `.ractions .actions` in the stylesheet.
  //
  // This comment used to claim that a card's actions "always fit across the card". They do not,
  // and nobody had measured it (#132 / ERPlora/appointments#154): with the eight actions an
  // appointment carries, the row asks for 380px and the card gives 379px at 411dp, 237px at 768px
  // and 272px at 1440px — so the first button hung off the card at ALL THREE widths, not just on
  // a phone. If you add a view that lays these buttons out, MEASURE it.
  actionButtons(row, collapsible = false) {
    if (!this.actions.length) return A;
    const key = this.keyOf(row);
    if (collapsible && this.rowActionsCollapsed) {
      return b2`
        <div class="actions">
          <ion-button
            size="small"
            fill="clear"
            color="medium"
            data-testid=${this.tid(`row-${key}-menu`)}
            aria-label=${this.t.moreActions}
            title=${this.t.moreActions}
            aria-haspopup="menu"
            @click=${(e5) => this.openRowMenu(e5, row)}
          >
            <ion-icon slot="icon-only" .icon=${okIcon(iconEllipsisVertical)}></ion-icon>
          </ion-button>
        </div>
      `;
    }
    return b2`
      <div class="actions">
        ${this.actions.map(
      (a3) => {
        const loading = a3.loading?.(row) === true;
        const disabled = loading || a3.disabled?.(row) === true;
        const label = typeof a3.label === "function" ? a3.label(row) : a3.label;
        return b2`
            <ion-button
              size="small"
              fill="clear"
              color=${a3.color ?? "medium"}
              data-testid=${this.tid(`row-${key}-${a3.id}`)}
              ?disabled=${disabled}
              aria-disabled=${disabled ? "true" : A}
              aria-label=${label}
              title=${label}
              @click=${() => this.emit("rowAction", { actionId: a3.id, row })}
            >
              ${loading ? b2`<ion-spinner slot="icon-only" name="dots"></ion-spinner>` : a3.icon ? b2`<ion-icon slot="icon-only" .icon=${okIcon(a3.icon)}></ion-icon>` : label}
            </ion-button>
          `;
      }
    )}
      </div>
    `;
  }
  // Botón de barra icon-only (filtros / alta / conmutador de vista). `on` = estado activo.
  // `badge` opcional → contador (p.ej. nº de filtros activos), look del Hub.
  toolButton(icon, on, onClick, label, badge, testid = A) {
    return b2`
      <ion-button class="toolbtn" size="small" fill=${on ? "solid" : "outline"} data-testid=${testid} title=${label} aria-label=${label} @click=${onClick}>
        <ion-icon slot="icon-only" .icon=${okIcon(icon)}></ion-icon>
        ${badge && badge > 0 ? b2`<span class="badge">${badge}</span>` : A}
      </ion-button>
    `;
  }
  /** Plantilla de columnas del grid de la vista lista: [checkbox] [columnas…] [acciones]. */
  gridTemplate() {
    return [
      this.selectable ? "2.75rem" : null,
      // #120 - 5.5rem (88px) is the narrowest a data column can be and stay readable: ~11
      // characters at 14px, plus the ellipsis `.gcell > span` already applies. With the previous
      // floor (8rem = 128px) the six columns of a bookings list did not fit the counter tablet
      // (128x6 + 188 for actions + gaps = 1036px against 834) and the pinned column ended up on
      // top of the data. With 5.5rem they fit (796px) and `1fr` stretches them to 94px each.
      ...this.visibleColumns.map((c5) => c5.width ?? "minmax(5.5rem,1fr)"),
      // #121 - a LENGTH, not `max-content`. The header and every row are separate grids that
      // share this string, and a content-sized track is not a length: each grid resolves it
      // against ITS OWN content - the word "ACCIONES" (62.83px) in the header, four buttons
      // (188px) in the row. The leftover the `1fr` columns share then differed between the two,
      // and the header slid right, up to 125px by the last column (measured at 834px).
      // `actionsTrackPx` is the width of the buttons MEASURED on screen, so it also keeps #120's
      // contract: the track never shrinks under its content (an `auto` track collapsed to 16px
      // and the buttons spilled over the neighbouring column). Until the first measurement lands
      // - one frame - `max-content` reserves the same room it always did.
      this.actions.length ? this.actionsTrackPx > 0 ? `${this.actionsTrackPx}px` : "max-content" : null
    ].filter(Boolean).join(" ");
  }
  /** Lista de páginas a mostrar en el pager numerado (1-based): primera, última, vecinas de la
   *  actual y «…» donde haya saltos. P.ej. en página 1 de 52 → [1,2,3,'…',52]. */
  pageList(cur1, total) {
    if (total <= 7) return Array.from({ length: total }, (_2, i7) => i7 + 1);
    const want = /* @__PURE__ */ new Set([1, total, cur1, cur1 - 1, cur1 + 1]);
    if (cur1 <= 3) [2, 3].forEach((p4) => want.add(p4));
    if (cur1 >= total - 2) [total - 1, total - 2].forEach((p4) => want.add(p4));
    const sorted = [...want].filter((p4) => p4 >= 1 && p4 <= total).sort((a3, b3) => a3 - b3);
    const out = [];
    let prev = 0;
    for (const p4 of sorted) {
      if (p4 - prev > 1) out.push("\u2026");
      out.push(p4);
      prev = p4;
    }
    return out;
  }
  render() {
    const ps = this.serverSide ? this.pageSize : this.clientPageSize || this.pageSize;
    let visible;
    let pages;
    let current;
    let count;
    if (this.serverSide) {
      visible = this.rows;
      count = this.total;
      pages = Math.max(1, Math.ceil(this.total / ps));
      current = Math.min(this.page, pages - 1);
    } else {
      const filtered = this.clientFiltered;
      count = filtered.length;
      pages = Math.max(1, Math.ceil(filtered.length / ps));
      current = Math.min(this.clientPage, pages - 1);
      visible = this.isMobile ? filtered.slice(0, Math.min(this.mobileShown || ps, count)) : filtered.slice(current * ps, current * ps + ps);
    }
    const served = this.serverSide ? (current + 1) * ps : Math.min(this.mobileShown || ps, count);
    const canLoadMore = this.isMobile && served < count;
    const loadMore = () => {
      if (this.serverSide) this.emit("pageChange", current + 1);
      else this.mobileShown = Math.min((this.mobileShown || ps) + ps, count);
    };
    const goTo = (p4) => {
      if (this.serverSide) this.emit("pageChange", p4);
      else this.clientPage = p4;
    };
    const setPageSize = (n6) => {
      if (this.serverSide) this.emit("pageSizeChange", n6);
      else {
        this.clientPageSize = n6;
        this.clientPage = 0;
        this.mobileShown = 0;
      }
    };
    const searchbar = b2`<ion-searchbar class="ion-no-border" data-testid=${this.tid("search")} .value=${this.q} placeholder=${this.effSearchPlaceholder} debounce="250" @ionInput=${this.onSearch}></ion-searchbar>`;
    const selCount = this.selection.size;
    const showTopbar = !!this.title || this.hasSearch || this.viewToggle || this.effColumnPicker || this.effExport || this.effImport || this.hasFilterRow || this.addable || !!this.primaryAction;
    return b2`
      <div class=${`card${this.panel !== "none" ? " has-panel" : ""}`}>
        ${showTopbar ? b2`
              <div class="bar">
                <div class="bar-main">
                  ${this.title ? b2`<div class="title-wrap"><h2 class="title">${this.title}</h2><span class="title-count">${count}</span></div>` : A}
                  ${this.hasSearch ? b2`<div class="search">${searchbar}</div>` : A}
                  ${this.inlineFilters ? this.renderInlineFilters() : A}
                  <span class="tk-spacer"></span>
                    ${this.effColumnPicker && !this.isMobile ? b2`
                          <ion-select
                            class="tk-cols"
                            multiple
                            interface="popover"
                            aria-label=${this.t.columnsVisible}
                            .value=${this.visibleColumns.map((c5) => c5.key)}
                            .selectedText=${this.t.columns}
                            @ionChange=${(e5) => this.setVisibleColumns(e5.detail.value)}
                          >
                            ${this.columns.map((c5) => b2`<ion-select-option value=${c5.key}>${c5.header}</ion-select-option>`)}
                          </ion-select>
                        ` : A}
                    ${this.effPageSizes.length && !this.isMobile ? b2`
                          <ion-select
                            class="tk-psize"
                            interface="popover"
                            aria-label=${this.t.rowsPerPage}
                            .value=${ps}
                            @ionChange=${(e5) => setPageSize(Number(e5.detail.value))}
                          >
                            ${this.effPageSizes.map((n6) => b2`<ion-select-option .value=${n6}>${n6}</ion-select-option>`)}
                          </ion-select>
                        ` : A}
                    ${this.viewToggle ? b2`
                          <span class="viewseg">
                            ${this.toolButton("list-outline", this.viewMode === "table", () => this.setViewMode("table"), this.t.viewList)}
                            ${this.toolButton("grid-outline", this.viewMode === "cards", () => this.setViewMode("cards"), this.t.viewCards)}
                          </span>
                        ` : A}
                    ${this.hasFilterRow && !this.inlineFilters ? this.toolButton("funnel-outline", this.panel === "filters" || this.activeFilterCount > 0, () => this.toggle("filters"), this.t.filters, this.activeFilterCount) : A}
                    ${this.effImport ? b2`
                          ${this.toolButton("cloud-upload-outline", false, () => this.renderRoot.querySelector(".tk-file")?.click(), this.t.importCsv)}
                          <!-- #143 — The import hook goes on the INPUT, not on the button that
                               triggers it: what a spec drives is «setInputFiles», and nobody opens
                               the button's native dialog from a test. Same criterion as
                               «GrantFilePicker.vue» in the Hub (the hook goes on the control, not
                               on its disguise). -->
                          <input class="tk-file" data-testid=${this.tid("csv-import")} type="file" accept=".csv,text/csv" hidden @change=${(e5) => this.onImportFile(e5)} />
                        ` : A}
                    ${this.effExport ? this.toolButton("download-outline", false, () => this.exportCsv(), this.t.exportCsv, void 0, this.tid("csv-export")) : A}
                    <!-- #113 — Mismo botón en los dos viewports: la acción principal de la pantalla
                         se lee, no se adivina. En escritorio era un «+» de 36px idéntico a los
                         iconos de vista/filtrar/exportar, y era el último de cuatro. -->
                    ${this.addable ? b2`
                          <ion-button class="primary-btn add-btn" data-testid=${this.tid("add")} size="small" @click=${() => this.toggle("create")}>
                            <ion-icon slot="start" .icon=${okIcon("add")}></ion-icon>${this.t.add}
                          </ion-button>
                        ` : A}
                    ${this.renderOverflowMenu()}
                    ${this.primaryAction ? b2`
                          <!-- #143 — Its own hook and NOT «-add»: «addable» and «primaryAction» are
                               two different buttons that may coexist, and both are really used
                               («addable» in the modules, «primaryAction» in the SaaS screens).
                               Sharing the name would give two elements with the same hook as soon
                               as a screen declared both. -->
                          <ion-button class="primary-btn add-btn" data-testid=${this.tid("primary-action")} size="small" @click=${() => this.emit("primaryAction", {})}>
                            <ion-icon slot="start" .icon=${okIcon(this.primaryAction.icon ?? "add")}></ion-icon>${this.primaryAction.label}
                          </ion-button>
                        ` : A}
                    <!-- El módulo proyecta aquí acciones globales adicionales. -->
                    <slot name="toolbar"></slot>
                </div>
                ${this.selectable && selCount > 0 ? b2`
                      <div class="selbar">
                        <strong>${this.t.selected.replace("{n}", String(selCount))}</strong>
                        <button class="sel-clear" @click=${() => this.setSelection(/* @__PURE__ */ new Set())}>
                          <ion-icon .icon=${iconClose} style="font-size:14px"></ion-icon> ${this.t.clear}
                        </button>
                      </div>
                    ` : A}
              </div>
            ` : A}

        ${this.viewMode === "cards" && this.cardViewEnabled ? this.renderCards(visible) : this.renderTable(visible)}

        ${pages > 1 || this.effPageSizes.length ? b2`
              <div class="pager">
                <div class="left">
                  <span>
                    ${pages > 1 ? b2`${this.t.showing.replace("{from}", String(this.isMobile && !this.serverSide ? 1 : current * ps + 1)).replace("{to}", String(Math.min(served, count)))} ` : A}
                    <span class="strong">${count}</span> ${count === 1 ? this.t.recordSingular : this.t.recordPlural}
                  </span>
                  ${!showTopbar && this.effPageSizes.length ? b2`
                        <select class="psize" @change=${(e5) => setPageSize(Number(e5.target.value))}>
                          ${this.effPageSizes.map((n6) => b2`<option value=${n6} ?selected=${n6 === ps}>${this.t.perPageShort.replace("{n}", String(n6))}</option>`)}
                        </select>
                      ` : A}
                </div>
                ${this.isMobile ? canLoadMore ? b2`<ion-button class="load-more" data-testid=${this.tid("load-more")} size="small" @click=${loadMore}>${this.t.loadMore}</ion-button>` : A : pages > 1 ? b2`
                      <div class="nav">
                        <ion-button size="small" fill="clear" data-testid=${this.tid("page-prev")} ?disabled=${current === 0} @click=${() => goTo(current - 1)}><ion-icon slot="icon-only" .icon=${iconChevronBack}></ion-icon></ion-button>
                        ${this.pageList(current + 1, pages).map(
      (p4) => p4 === "\u2026" ? b2`<span class="pgap">…</span>` : b2`<button class=${`pnum${p4 === current + 1 ? " on" : ""}`} @click=${() => goTo(p4 - 1)}>${p4}</button>`
    )}
                        <ion-button size="small" fill="clear" data-testid=${this.tid("page-next")} ?disabled=${current >= pages - 1} @click=${() => goTo(current + 1)}><ion-icon slot="icon-only" .icon=${iconChevronForward}></ion-icon></ion-button>
                      </div>
                    ` : A}
              </div>
            ` : A}

        ${this.panel !== "none" ? this.renderDrawer() : A}
      </div>
    `;
  }
  // Panel lateral derecho DENTRO de la tabla (no empuja contenido; igual en lista y tarjetas).
  renderDrawer() {
    const isFilters = this.panel === "filters";
    const clientFilters = isFilters && !this.serverSide;
    return b2`
      <div class="tk-scrim" @click=${() => this.close()}></div>
      <aside class="drawer" role="dialog" aria-label=${isFilters ? this.t.filters : this.t.form}>
        <header class="dh">
          <strong>${isFilters ? this.t.filters : this.t.newRecord}</strong>
          <ion-button fill="clear" size="small" aria-label=${this.t.close} @click=${() => this.close()}><ion-icon slot="icon-only" .icon=${iconClose}></ion-icon></ion-button>
        </header>
        <div class="db">
          ${isFilters ? clientFilters ? this.filterColumns.map((c5) => this.renderClientFilter(c5)) : this.filterColumns.map((c5) => b2`<div class="fblock">${this.renderFilterControl(c5)}</div>`) : b2`<slot name="create"></slot>`}
        </div>
        ${clientFilters ? b2`
              <footer class="df">
                <button class="sel-clear df-clear" ?disabled=${Object.keys(this.filterDraft).length === 0} @click=${() => this.clearFilters()}>${this.t.clear}</button>
                <ion-button class="primary-btn" size="small" @click=${() => this.applyFilters()}>${this.t.apply}</ion-button>
              </footer>
            ` : A}
      </aside>
    `;
  }
  // Control de filtro CLIENTE de una columna: chips multi-select (select) o rango de fechas.
  renderClientFilter(col) {
    const label = col.header;
    if (col.filterType === "daterange" || col.filterType === "date") {
      const f3 = this.filterDraft[col.key] ?? {};
      return b2`
        <div class="fblock">
          <span class="flabel">${label}</span>
          <div class="daterange">
            <ion-input type="date" label=${this.t.from} label-placement="stacked" fill="outline" mode="md" .value=${f3.from ?? ""} @ionChange=${(e5) => this.setFilterRange(col.key, "from", e5.detail.value ?? "")}></ion-input>
            <ion-input type="date" label=${this.t.to} label-placement="stacked" fill="outline" mode="md" .value=${f3.to ?? ""} @ionChange=${(e5) => this.setFilterRange(col.key, "to", e5.detail.value ?? "")}></ion-input>
          </div>
        </div>
      `;
    }
    const opts = col.options ?? this.distinctValues(col).map((v3) => ({ value: v3, label: v3 }));
    const selected = [...this.filterDraft[col.key]?.values ?? /* @__PURE__ */ new Set()];
    return b2`
      <div class="fblock">
        <ion-select
          label=${label}
          label-placement="stacked"
          fill="outline" mode="md"
          multiple
          interface="modal"
          .interfaceOptions=${{ cssClass: "ok-overlay" }}
          placeholder=${this.t.select}
          .value=${selected}
          @ionChange=${(e5) => this.setFilterValues(col.key, e5.detail.value ?? [])}
        >
          ${opts.length === 0 ? b2`<ion-select-option .disabled=${true} value="">${this.t.noValues}</ion-select-option>` : opts.map((o7) => b2`<ion-select-option value=${o7.value}>${o7.label}</ion-select-option>`)}
        </ion-select>
      </div>
    `;
  }
  /** #67 — Enter/Espacio activan la fila clicable (y, desde #74, la tarjeta): si se llega con el
   *  tabulador, el ratón no puede ser el único camino. Espacio además NO debe desplazar la página. */
  onRowKeydown(e5, row) {
    if (e5.key !== "Enter" && e5.key !== " " && e5.key !== "Spacebar") return;
    e5.preventDefault();
    this.emit("rowClick", { row });
  }
  emptyState() {
    return b2`
      <div class="empty">
        <span class="empty-ic"><ion-icon .icon=${iconFileTrayOutline}></ion-icon></span>
        <span>${this.effEmptyMessage}</span>
      </div>
    `;
  }
  // Vista LISTA en CSS GRID (no <table>): permite ancho por columna y cabecera sticky.
  renderTable(visible) {
    if (visible.length === 0) return this.emptyState();
    const cols = this.visibleColumns;
    const tpl = { gridTemplateColumns: this.gridTemplate() };
    const allOn = this.selectable && visible.length > 0 && visible.every((r6) => this.selection.has(this.keyOf(r6)));
    const alignCls = (a3) => a3 === "right" ? "right" : a3 === "center" ? "center" : "left";
    return b2`
      <div class=${`scroll${this.xOverflow ? " x-overflow" : ""}`}>
        <div class="grid" role="table">
          <!-- Cabecera -->
          <div class="grow ghead" role="row" style=${o6(tpl)}>
            ${this.selectable ? b2`<span class="selcb"><ion-checkbox .checked=${allOn} aria-label=${this.t.selectAll} @ionChange=${() => this.toggleAll(visible)}></ion-checkbox></span>` : A}
            ${cols.map((c5) => {
      const sortable = this.isSortable(c5);
      const active = sortable && (this.serverSide ? this.sort === c5.key : this.clientSort === c5.key);
      const dir = this.serverSide ? this.sortDir : this.clientSortDir;
      const caretIcon = !active ? iconSwapVerticalOutline : dir === "asc" ? iconChevronUpOutline : iconChevronDownOutline;
      return b2`
                <div
                  class=${`gcell gh ${alignCls(c5.align)}${sortable ? " sortable" : ""}${c5.pinned === "end" ? " actions-col" : ""}`}
                  role="columnheader"
                  @click=${() => this.onHeaderClick(c5)}
                >
                  <span>${c5.header}</span>
                  ${sortable ? b2`<span class=${`caret${active ? " on" : ""}`}><ion-icon .icon=${okIcon(caretIcon)}></ion-icon></span>` : A}
                </div>
              `;
    })}
            ${this.actions.length ? b2`<div class="gcell gh right actions-col" role="columnheader">
                  ${this.rowActionsCollapsed ? b2`<span class="sr-only">${this.t.actions}</span>` : b2`<span>${this.t.actions}</span>`}
                </div>` : A}
          </div>

          <!-- Filas -->
          ${c4(
      visible,
      (row) => this.keyOf(row),
      (row) => {
        const key = this.keyOf(row);
        const selected = this.selectable && this.selection.has(key);
        return b2`
                <div
                  class=${`grow grow-data${selected ? " selected" : ""}${this.rowClickable ? " clickable" : ""}`}
                  role="row"
                  data-testid=${this.tid(`row-${key}`)}
                  style=${o6(tpl)}
                  tabindex=${this.rowClickable ? "0" : A}
                  @click=${this.rowClickable ? () => this.emit("rowClick", { row }) : A}
                  @keydown=${this.rowClickable ? (e5) => this.onRowKeydown(e5, row) : A}
                >
                  ${this.selectable ? b2`<span class="selcb" @click=${(e5) => e5.stopPropagation()}><ion-checkbox .checked=${selected} aria-label=${this.t.selectRow} @ionChange=${() => this.toggleRow(key)}></ion-checkbox></span>` : A}
                  ${cols.map(
          (c5) => b2`<div class=${`gcell ${alignCls(c5.align)}${c5.pinned === "end" ? " actions-col" : ""}`} role="cell">${c5.render ? c5.render(row) : b2`<span>${this.cell(c5, row)}</span>`}</div>`
        )}
                  ${this.actions.length ? b2`<div class="gcell right actions-col" role="cell" @click=${(e5) => e5.stopPropagation()}>${this.actionButtons(row, true)}</div>` : A}
                </div>
              `;
      }
    )}
        </div>
      </div>
      ${this.renderRowMenu()}
    `;
  }
  renderCards(visible) {
    if (visible.length === 0) return this.emptyState();
    const hasHead = !!this.cardTitle || !!this.cardIcon || this.selectable;
    return b2`
      <div class="cards-grid">
        ${c4(
      visible,
      (row) => this.keyOf(row),
      (row) => {
        const key = this.keyOf(row);
        const selected = this.selectable && this.selection.has(key);
        const icon = this.cardIcon?.(row);
        return b2`
              <ion-card
                class=${`rcard${selected ? " selected" : ""}${this.rowClickable ? " clickable" : ""}`}
                data-testid=${this.tid(`row-${key}`)}
                role=${this.rowClickable ? "button" : A}
                tabindex=${this.rowClickable ? "0" : A}
                @click=${this.rowClickable ? () => this.emit("rowClick", { row }) : A}
                @keydown=${this.rowClickable ? (e5) => this.onRowKeydown(e5, row) : A}
              >
                ${hasHead ? b2`
                      <ion-card-header class="rcard-head">
                        ${icon != null && icon !== "" ? b2`<span class="rc-icon">${typeof icon === "string" ? b2`<ion-icon .icon=${okIcon(icon)}></ion-icon>` : icon}</span>` : A}
                        <span class="rc-title">${this.cardTitle ? this.cardTitle(row) : A}</span>
                        ${this.selectable ? b2`<ion-checkbox .checked=${selected} aria-label=${this.t.select} @click=${(e5) => e5.stopPropagation()} @ionChange=${() => this.toggleRow(key)}></ion-checkbox>` : A}
                      </ion-card-header>
                    ` : A}
                <ion-card-content class="rcard-body">
                  ${this.renderCard ? this.renderCard(row) : this.visibleColumns.map(
          (c5) => b2`<div class="rrow"><span class="rk">${c5.header}</span><span class="rv">${c5.render ? c5.render(row) : this.cell(c5, row)}</span></div>`
        )}
                </ion-card-content>
                ${this.actions.length ? b2`<div class="ractions" @click=${(e5) => e5.stopPropagation()}>${this.actionButtons(row)}</div>` : A}
              </ion-card>
            `;
      }
    )}
      </div>
    `;
  }
};
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "columns");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "rows");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "searchKeys");
__decorateClass3([
  n4({ attribute: "row-key-field" })
], _OkDataTable.prototype, "rowKeyField");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "rowKey");
__decorateClass3([
  n4({ type: Number, attribute: "page-size" })
], _OkDataTable.prototype, "pageSize");
__decorateClass3([
  n4({ attribute: "empty-message" })
], _OkDataTable.prototype, "emptyMessage");
__decorateClass3([
  n4({ attribute: "search-placeholder" })
], _OkDataTable.prototype, "searchPlaceholder");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "labels");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "actions");
__decorateClass3([
  n4({ type: Boolean })
], _OkDataTable.prototype, "addable");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "pageSizeOptions");
__decorateClass3([
  n4({ type: Boolean, reflect: true })
], _OkDataTable.prototype, "fill");
__decorateClass3([
  n4({ type: Boolean, attribute: "column-picker" })
], _OkDataTable.prototype, "columnPicker");
__decorateClass3([
  n4({ type: Boolean })
], _OkDataTable.prototype, "csv");
__decorateClass3([
  n4({ attribute: "csv-name" })
], _OkDataTable.prototype, "csvName");
__decorateClass3([
  n4({ type: Boolean, attribute: "server-side" })
], _OkDataTable.prototype, "serverSide");
__decorateClass3([
  n4({ type: Number })
], _OkDataTable.prototype, "total");
__decorateClass3([
  n4({ type: Number })
], _OkDataTable.prototype, "page");
__decorateClass3([
  n4({ type: Boolean })
], _OkDataTable.prototype, "searchable");
__decorateClass3([
  n4({ type: String })
], _OkDataTable.prototype, "search");
__decorateClass3([
  n4({ type: String })
], _OkDataTable.prototype, "sort");
__decorateClass3([
  n4({ attribute: "sort-dir" })
], _OkDataTable.prototype, "sortDir");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "filterValues");
__decorateClass3([
  n4()
], _OkDataTable.prototype, "title");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "views");
__decorateClass3([
  n4({ attribute: "default-view" })
], _OkDataTable.prototype, "defaultView");
__decorateClass3([
  n4({ type: Boolean })
], _OkDataTable.prototype, "exportable");
__decorateClass3([
  n4({ type: Boolean })
], _OkDataTable.prototype, "importable");
__decorateClass3([
  n4({ type: Boolean, attribute: "column-selector" })
], _OkDataTable.prototype, "columnSelector");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "pageSizes");
__decorateClass3([
  n4({ type: Boolean, attribute: "row-clickable" })
], _OkDataTable.prototype, "rowClickable");
__decorateClass3([
  n4({ type: Boolean })
], _OkDataTable.prototype, "selectable");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "selectedKeys");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "primaryAction");
__decorateClass3([
  n4({ type: Boolean })
], _OkDataTable.prototype, "inlineFilters");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "menuActions");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "cardTitle");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "cardIcon");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "renderCard");
__decorateClass3([
  n4({ type: String })
], _OkDataTable.prototype, "testid");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "q");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "clientPage");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "clientPageSize");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "mobileShown");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "clientSort");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "clientSortDir");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "clientFilters");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "filterDraft");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "serverFilters");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "panel");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "viewMode");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "isMobile");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "xOverflow");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "actionsTrackPx");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "rowActionsCollapsed");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "rowMenuOpen");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "hiddenKeys");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "internalSelection");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "menuOpen");
var OkDataTable = _OkDataTable;
define("ok-data-table", OkDataTable);

// @erplora/module-sdk/src/index.ts
function isEmpty(v3) {
  return v3 === null || v3 === void 0 || v3 === "";
}
var ListController = class {
  constructor(client, queryName, onChange = () => {
  }, opts = {}) {
    this.client = client;
    this.queryName = queryName;
    this.onChange = onChange;
    this.rows = [];
    this.total = 0;
    this.loading = false;
    this.error = "";
    /** Descarta respuestas obsoletas si llegan fuera de orden (race de cargas concurrentes). */
    this.seq = 0;
    this.state = {
      page: 0,
      pageSize: opts.pageSize ?? 50,
      search: "",
      sort: opts.sort,
      dir: opts.dir ?? "asc",
      filters: { ...opts.filters ?? {} },
      context: { ...opts.context ?? {} }
    };
  }
  /** Nº de páginas según el total del servidor (mínimo 1). */
  get pageCount() {
    return Math.max(1, Math.ceil(this.total / this.state.pageSize));
  }
  /** (Re)carga la página actual desde el servidor. */
  async load() {
    const s5 = this.state;
    const mySeq = ++this.seq;
    this.loading = true;
    this.error = "";
    this.onChange();
    try {
      const page = await this.client.queryPage(this.queryName, {
        limit: s5.pageSize,
        offset: s5.page * s5.pageSize,
        search: s5.search,
        sort: s5.sort,
        dir: s5.dir,
        filters: s5.filters,
        params: s5.context
      });
      if (mySeq !== this.seq) return;
      this.rows = page.rows ?? [];
      this.total = page.total ?? this.rows.length;
    } catch (e5) {
      if (mySeq !== this.seq) return;
      this.rows = [];
      this.total = 0;
      this.error = e5 instanceof Error ? e5.message : "Error cargando datos";
    } finally {
      if (mySeq === this.seq) {
        this.loading = false;
        this.onChange();
      }
    }
  }
  setPage(page) {
    this.state.page = Math.max(0, page);
    void this.load();
  }
  setSort(sort, dir) {
    this.state.sort = sort;
    this.state.dir = dir;
    this.state.page = 0;
    void this.load();
  }
  setSearch(search) {
    this.state.search = search;
    this.state.page = 0;
    void this.load();
  }
  /** Cambia el nº de filas por página y recarga desde la página 0. */
  setPageSize(pageSize) {
    this.state.pageSize = Math.max(1, pageSize);
    this.state.page = 0;
    void this.load();
  }
  /** Aplica/quita un filtro de columna; valores vacíos lo eliminan. Vuelve a la página 0. */
  setFilter(col, value) {
    if (isEmpty(value)) {
      delete this.state.filters[col];
    } else if (typeof value === "object" && value !== null) {
      const prev = this.state.filters[col] ?? {};
      const merged = { ...prev, ...value };
      const cleaned = Object.fromEntries(Object.entries(merged).filter(([, v3]) => !isEmpty(v3)));
      if (Object.keys(cleaned).length === 0) delete this.state.filters[col];
      else this.state.filters[col] = cleaned;
    } else {
      this.state.filters[col] = value;
    }
    this.state.page = 0;
    void this.load();
  }
  /** Fija/actualiza los params de contexto obligatorios (p.ej. al seleccionar el padre).
   *  Vuelve a la página 0 y recarga. Pasa `{}` o keys con valor vacío para limpiar. */
  setContext(context) {
    this.state.context = { ...context };
    this.state.page = 0;
    void this.load();
  }
  reset() {
    this.state.page = 0;
    this.state.search = "";
    this.state.filters = {};
    void this.load();
  }
};
function createListController(client, queryName, onChange = () => {
}, opts = {}) {
  return new ListController(client, queryName, onChange, opts);
}
function majorToMinor(amount, decimals) {
  const n6 = Number(amount);
  return Number.isFinite(n6) ? Math.round(n6 * 10 ** decimals) : 0;
}
function minorToMajor(amount, decimals) {
  return (amount ?? 0) / 10 ** decimals;
}

// locales/es.json
var es_default = {
  name: "Personal",
  description: "Empleados, puestos, horarios y solicitudes de vacaciones.",
  navigation: {
    staff: {
      label: "Personal"
    },
    roles: {
      label: "Roles"
    },
    time_off: {
      label: "Ausencias"
    },
    schedules: {
      label: "Horarios"
    }
  },
  settings: {
    title: "Personal",
    fields: {
      default_work_start: {
        label: "Inicio de jornada (HH:MM)",
        description: "Hora de inicio de la jornada por defecto. La jornada nocturna (fin antes del inicio) es v\xE1lida."
      },
      default_work_end: {
        label: "Fin de jornada (HH:MM)",
        description: "Hora de fin de la jornada por defecto. Si es anterior al inicio, se entiende que el turno cruza la medianoche."
      },
      default_break_duration: {
        label: "Duraci\xF3n del descanso (minutos)",
        description: "Entre 0 y 480 minutos."
      },
      min_advance_booking: {
        label: "Antelaci\xF3n m\xEDnima de reserva (horas)",
        description: "Entre 0 y 168 horas (una semana)."
      },
      max_daily_hours: {
        label: "Horas m\xE1ximas por d\xEDa",
        description: "Entre 1 y 24 horas."
      },
      overtime_threshold: {
        label: "Umbral de horas extra (horas/semana)",
        description: "Entre 1 y 168 horas semanales."
      },
      show_staff_photos: {
        label: "Mostrar fotos del personal"
      },
      show_staff_bio: {
        label: "Mostrar biograf\xEDa del personal"
      },
      allow_staff_selection: {
        label: "Permitir elegir profesional"
      },
      notify_new_appointment: {
        label: "Avisar de nueva cita"
      },
      notify_cancellation: {
        label: "Avisar de cancelaci\xF3n"
      }
    }
  },
  ui: {
    staffTitle: "Personal",
    colName: "Nombre",
    colRole: "Rol",
    colEmail: "Email",
    colPhone: "Tel\xE9fono",
    colStatus: "Estado",
    colHourlyRate: "Tarifa/h",
    phFirstName: "Nombre",
    phLastName: "Apellidos",
    phEmail: "Email",
    phRole: "Rol\u2026",
    actionAdd: "A\xF1adir",
    actionEdit: "Editar",
    panelNew: "Nuevo",
    panelEdit: "Editar \xB7 {name}",
    actionSave: "Guardar",
    actionSaving: "Guardando\u2026",
    searchMember: "Buscar miembro\u2026",
    loading: "Cargando\u2026",
    emptyMembers: "Sin miembros del staff.",
    errCreateMember: "No se pudo crear el miembro",
    rolesTitle: "Roles",
    colDescription: "Descripci\xF3n",
    colMembers: "Miembros",
    phRoleName: "Nombre del rol",
    phDescription: "Descripci\xF3n",
    colColor: "Color",
    phColor: "Color (#RRGGBB)",
    searchRole: "Buscar rol\u2026",
    emptyRoles: "Sin roles definidos.",
    errCreateRole: "No se pudo crear el rol",
    timeOffTitle: "Ausencias",
    colMember: "Miembro",
    colType: "Tipo",
    colFrom: "Desde",
    colTo: "Hasta",
    statusPending: "Pendiente",
    statusApproved: "Aprobada",
    statusRejected: "Rechazada",
    statusCancelled: "Cancelada",
    actionApprove: "Aprobar",
    actionReject: "Rechazar",
    emptyTimeOff: "Sin solicitudes de ausencia.",
    errSetStatus: "No se pudo cambiar el estado",
    leaveVacation: "Vacaciones",
    leaveSick: "Baja por enfermedad",
    leavePersonal: "Asuntos propios",
    leaveTraining: "Formaci\xF3n",
    leaveOther: "Otros",
    fullDay: "D\xEDa completo",
    timeFrom: "Desde (hora)",
    timeTo: "Hasta (hora)",
    reason: "Motivo",
    errCreateTimeOff: "No se pudo registrar la ausencia",
    valTimeOffMember: "Elige de qui\xE9n es la ausencia.",
    valTimeOffDates: "Indica la fecha de inicio y la de fin.",
    valTimeOffRange: "La fecha de fin no puede ser anterior a la de inicio.",
    valTimeOffHours: "Una ausencia de medio d\xEDa necesita hora de inicio y de fin.",
    valTimeOffHoursOrder: "La hora de inicio tiene que ser anterior a la de fin.",
    schedulesTitle: "Horarios",
    phMember: "Miembro\u2026",
    colSchedule: "Horario",
    colDefault: "Por defecto",
    colActive: "Activo",
    valYes: "S\xED",
    valNo: "No",
    hintNoMembers: "Da de alta miembros del staff para poder asignarles horarios.",
    emptySchedules: "Este miembro a\xFAn no tiene horarios.",
    newScheduleTitle: "Nuevo horario",
    phScheduleName: "Nombre del horario",
    defaultScheduleName: "Horario habitual",
    labelEffectiveFrom: "Vigente desde",
    labelEffectiveUntil: "Vigente hasta",
    labelDefault: "Por defecto",
    actionCreateSchedule: "Crear horario",
    errLoadMembers: "No se pudieron cargar los miembros",
    errLoadSchedules: "No se pudieron cargar los horarios",
    errCreateSchedule: "No se pudo crear el horario",
    valNeedWorkingDay: "Marca al menos un d\xEDa de trabajo",
    valNeedStartEnd: "{day}: indica hora de inicio y fin",
    valStartBeforeEnd: "{day}: la hora de inicio debe ser anterior a la de fin",
    valBreakBoth: "{day}: el descanso necesita inicio y fin (o ninguno)",
    valBreakInside: "{day}: el descanso debe caer dentro del intervalo de trabajo",
    dayMonday: "Lunes",
    dayTuesday: "Martes",
    dayWednesday: "Mi\xE9rcoles",
    dayThursday: "Jueves",
    dayFriday: "Viernes",
    daySaturday: "S\xE1bado",
    daySunday: "Domingo",
    sepTo: "a",
    sepBreak: "descanso",
    notWorking: "No trabaja",
    ariaStart: "Inicio",
    ariaEnd: "Fin",
    ariaBreakStart: "Inicio descanso",
    ariaBreakEnd: "Fin descanso",
    hubUser: "Usuario del Hub",
    hubUserNone: "Sin acceso al Hub",
    hubUserWhyLink: "Sin usuario del Hub, las ventas de mostrador se atribuyen a quien tenga la sesi\xF3n y no le contar\xE1n para su comisi\xF3n.",
    servicesTitle: "Servicios que realiza",
    servicesEmpty: "Sin servicios asignados todav\xEDa.",
    servicesNoCatalog: "Instala el m\xF3dulo Servicios para asignar servicios a este profesional.",
    serviceAdd: "A\xF1adir servicio\u2026",
    serviceDuration: "Minutos (opcional)",
    servicePrice: "Precio (opcional)",
    serviceAssign: "Asignar",
    servicePrimary: "Servicio principal",
    serviceRemove: "Quitar servicio",
    errAssignService: "No se pudieron actualizar los servicios",
    colHours: "Horas",
    actionToggleActive: "Activar / desactivar",
    actionDelete: "Eliminar",
    cancel: "Cancelar",
    deleteScheduleTitle: "Eliminar horario",
    deleteScheduleMessage: "\xBFEliminar el horario \xAB{name}\xBB? Sus horas dejan de contar para la disponibilidad.",
    valRangeOrder: "\xABVigente desde\xBB tiene que ser anterior o igual a \xABVigente hasta\xBB.",
    errUpdateSchedule: "No se pudo actualizar el horario",
    employeeId: "N\xBA de empleado",
    roleNone: "Sin rol",
    status_active: "Activo",
    status_inactive: "Inactivo",
    status_on_leave: "De baja",
    status_terminated: "Dado de baja",
    bookable: "Reservable",
    bookingBuffer: "Margen entre citas (min)",
    hireDate: "Fecha de alta",
    specialties: "Especialidades",
    bio: "Bio",
    hourlyRate: "Tarifa por hora",
    commissionPct: "Comisi\xF3n (%)",
    actionDeactivate: "Desactivar",
    actionTerminate: "Dar de baja",
    deactivateTitle: "Desactivar profesional",
    deactivateMessage: "\xBFSacar a {name} de la agenda? Deja de ser reservable; no se borra nada.",
    terminateTitle: "Dar de baja",
    terminateMessage: "\xBFDar de baja a {name}? Su ficha se cierra y sus horarios y ausencias futuras dejan de contar.",
    terminationDate: "\xDAltimo d\xEDa (hoy si se deja vac\xEDo)",
    terminationReason: "Motivo (opcional)",
    errLoadMember: "No se pudo cargar la ficha",
    errLifecycle: "No se pudo cambiar el estado del profesional"
  },
  widgets: {
    "staff.headcount": {
      title: "Plantilla activa",
      label: "Empleados activos"
    },
    "staff.on_leave_today": {
      title: "Ausentes hoy",
      label: "Ausentes hoy"
    },
    "staff.pending_time_off": {
      title: "Ausencias pendientes",
      label: "Solicitudes por aprobar"
    },
    "staff.time_off_today": {
      title: "Ausencias de hoy"
    },
    "staff.by_role": {
      title: "Empleados por rol"
    }
  },
  errors: {
    "staff.member_not_found": "Ese miembro del personal no existe en este negocio.",
    "staff.already_inactive": "Ese miembro del personal ya est\xE1 inactivo.",
    "staff.active_time_off": "Ese miembro tiene ausencias pendientes o aprobadas que a\xFAn no han terminado. Resu\xE9lvelas primero.",
    "staff.overlapping_time_off": "Ese miembro ya tiene una ausencia pendiente o aprobada en esas fechas.",
    "staff.time_off_not_found": "Esa solicitud de ausencia no existe en este negocio.",
    "staff.invalid_transition": "Esa solicitud de ausencia no puede pasar a ese estado desde el actual.",
    "staff.role_not_found": "Ese rol no est\xE1 disponible: no existe en este negocio, o se ha eliminado o retirado.",
    "staff.member_update_rejected": "No se ha podido actualizar el miembro: no existe en este negocio, o el rol elegido no existe.",
    "staff.user_already_linked": "Ese usuario del Hub ya est\xE1 vinculado a {name}. Un usuario del Hub solo puede pertenecer a un miembro del equipo: desvinc\xFAlalo all\xED primero o elige otro usuario.",
    "staff.service_assign_rejected": "No se pudo asignar el servicio: ese profesional no existe en este negocio.",
    "staff.service_not_found": "Esa asignaci\xF3n de servicio no existe en este negocio.",
    "staff.schedule_not_found": "Ese horario no existe en este negocio.",
    "staff.schedule_no_hours": "Un horario necesita al menos un d\xEDa de trabajo con horas.",
    "staff.schedule_invalid_range": "La vigencia del horario termina antes de empezar."
  }
};

// locales/en.json
var en_default = {
  name: "Staff",
  navigation: {
    staff: {
      label: "Staff"
    },
    roles: {
      label: "Roles"
    },
    time_off: {
      label: "Time Off"
    },
    schedules: {
      label: "Horarios"
    }
  },
  settings: {
    title: "Staff",
    fields: {
      default_work_start: {
        label: "Working day starts (HH:MM)",
        description: "Default start of the working day. A night shift (end before start) is valid."
      },
      default_work_end: {
        label: "Working day ends (HH:MM)",
        description: "Default end of the working day. If it is earlier than the start, the shift is taken to cross midnight."
      },
      default_break_duration: {
        label: "Break duration (minutes)",
        description: "Between 0 and 480 minutes."
      },
      min_advance_booking: {
        label: "Minimum booking notice (hours)",
        description: "Between 0 and 168 hours (one week)."
      },
      max_daily_hours: {
        label: "Maximum hours per day",
        description: "Between 1 and 24 hours."
      },
      overtime_threshold: {
        label: "Overtime threshold (hours/week)",
        description: "Between 1 and 168 hours per week."
      },
      show_staff_photos: {
        label: "Show staff photos"
      },
      show_staff_bio: {
        label: "Show staff bio"
      },
      allow_staff_selection: {
        label: "Let customers choose the professional"
      },
      notify_new_appointment: {
        label: "Notify on a new appointment"
      },
      notify_cancellation: {
        label: "Notify on a cancellation"
      }
    }
  },
  ui: {
    staffTitle: "Staff",
    colName: "Name",
    colRole: "Role",
    colEmail: "Email",
    colPhone: "Phone",
    colStatus: "Status",
    colHourlyRate: "Rate/h",
    phFirstName: "First name",
    phLastName: "Last name",
    phEmail: "Email",
    phRole: "Role\u2026",
    actionAdd: "Add",
    actionEdit: "Edit",
    panelNew: "New",
    panelEdit: "Edit \xB7 {name}",
    actionSave: "Save",
    actionSaving: "Saving\u2026",
    searchMember: "Search member\u2026",
    loading: "Loading\u2026",
    emptyMembers: "No staff members.",
    errCreateMember: "Could not create the member",
    rolesTitle: "Roles",
    colDescription: "Description",
    colMembers: "Members",
    phRoleName: "Role name",
    phDescription: "Description",
    colColor: "Color",
    phColor: "Color (#RRGGBB)",
    searchRole: "Search role\u2026",
    emptyRoles: "No roles defined.",
    errCreateRole: "Could not create the role",
    timeOffTitle: "Time Off",
    colMember: "Member",
    colType: "Type",
    colFrom: "From",
    colTo: "To",
    statusPending: "Pending",
    statusApproved: "Approved",
    statusRejected: "Rejected",
    statusCancelled: "Cancelled",
    actionApprove: "Approve",
    actionReject: "Reject",
    emptyTimeOff: "No time-off requests.",
    errSetStatus: "Could not change the status",
    leaveVacation: "Vacation",
    leaveSick: "Sick leave",
    leavePersonal: "Personal",
    leaveTraining: "Training",
    leaveOther: "Other",
    fullDay: "Full day",
    timeFrom: "From (time)",
    timeTo: "To (time)",
    reason: "Reason",
    errCreateTimeOff: "Could not register the time off",
    valTimeOffMember: "Pick the staff member this time off is for.",
    valTimeOffDates: "Enter the start and end dates.",
    valTimeOffRange: "The end date must be on or after the start date.",
    valTimeOffHours: "A part-day absence needs a start and an end time.",
    valTimeOffHoursOrder: "The start time must be earlier than the end time.",
    schedulesTitle: "Schedules",
    phMember: "Member\u2026",
    colSchedule: "Schedule",
    colDefault: "Default",
    colActive: "Active",
    valYes: "Yes",
    valNo: "No",
    hintNoMembers: "Add staff members so you can assign them schedules.",
    emptySchedules: "This member has no schedules yet.",
    newScheduleTitle: "New schedule",
    phScheduleName: "Schedule name",
    defaultScheduleName: "Regular schedule",
    labelEffectiveFrom: "Effective from",
    labelEffectiveUntil: "Effective until",
    labelDefault: "Default",
    actionCreateSchedule: "Create schedule",
    errLoadMembers: "Could not load the members",
    errLoadSchedules: "Could not load the schedules",
    errCreateSchedule: "Could not create the schedule",
    valNeedWorkingDay: "Mark at least one working day",
    valNeedStartEnd: "{day}: enter a start and end time",
    valStartBeforeEnd: "{day}: the start time must be earlier than the end time",
    valBreakBoth: "{day}: the break needs a start and end (or neither)",
    valBreakInside: "{day}: the break must fall within the working interval",
    dayMonday: "Monday",
    dayTuesday: "Tuesday",
    dayWednesday: "Wednesday",
    dayThursday: "Thursday",
    dayFriday: "Friday",
    daySaturday: "Saturday",
    daySunday: "Sunday",
    sepTo: "to",
    sepBreak: "break",
    notWorking: "Off",
    ariaStart: "Start",
    ariaEnd: "End",
    ariaBreakStart: "Break start",
    ariaBreakEnd: "Break end",
    hubUser: "Hub user",
    hubUserNone: "No Hub access",
    hubUserWhyLink: "Without a Hub user, counter sales go to whoever is signed in and will not count towards this person's commission.",
    servicesTitle: "Services performed",
    servicesEmpty: "No services assigned yet.",
    servicesNoCatalog: "Install the Services module to assign services to this professional.",
    serviceAdd: "Add service\u2026",
    serviceDuration: "Minutes (optional)",
    servicePrice: "Price (optional)",
    serviceAssign: "Assign",
    servicePrimary: "Primary service",
    serviceRemove: "Remove service",
    errAssignService: "Could not update the services",
    colHours: "Hours",
    actionToggleActive: "Activate / deactivate",
    actionDelete: "Delete",
    cancel: "Cancel",
    deleteScheduleTitle: "Delete schedule",
    deleteScheduleMessage: 'Delete the schedule "{name}"? Its hours stop counting for availability.',
    valRangeOrder: '"Effective from" must be on or before "Effective until".',
    errUpdateSchedule: "Could not update the schedule",
    employeeId: "Employee ID",
    roleNone: "No role",
    status_active: "Active",
    status_inactive: "Inactive",
    status_on_leave: "On leave",
    status_terminated: "Terminated",
    bookable: "Bookable",
    bookingBuffer: "Buffer between appointments (min)",
    hireDate: "Hire date",
    specialties: "Specialties",
    bio: "Bio",
    hourlyRate: "Hourly rate",
    commissionPct: "Commission (%)",
    actionDeactivate: "Deactivate",
    actionTerminate: "Terminate",
    deactivateTitle: "Deactivate member",
    deactivateMessage: "Take {name} off the floor? They stop being bookable; nothing is deleted.",
    terminateTitle: "Terminate member",
    terminateMessage: "Terminate {name}? Their record is closed and their future schedules and absences stop counting.",
    terminationDate: "Last day (today if empty)",
    terminationReason: "Reason (optional)",
    errLoadMember: "Could not load the member",
    errLifecycle: "Could not change the member's status"
  },
  errors: {
    "staff.member_not_found": "That staff member does not exist in this business.",
    "staff.already_inactive": "That staff member is already inactive.",
    "staff.active_time_off": "That staff member has pending or approved time off that has not ended yet. Resolve it first.",
    "staff.overlapping_time_off": "That staff member already has pending or approved time off in those dates.",
    "staff.time_off_not_found": "That time-off request does not exist in this business.",
    "staff.invalid_transition": "That time-off request cannot change to that status from its current one.",
    "staff.role_not_found": "That role is not available: it does not exist in this business, or it has been deleted or retired.",
    "staff.member_update_rejected": "The staff member could not be updated: they do not exist in this business, or the role you picked does not.",
    "staff.user_already_linked": "That Hub user is already linked to {name}. A Hub user can belong to only one staff member: unlink it there first, or pick another user.",
    "staff.service_assign_rejected": "The service could not be assigned: that staff member does not exist in this business.",
    "staff.service_not_found": "That service assignment does not exist in this business.",
    "staff.schedule_not_found": "That schedule does not exist in this business.",
    "staff.schedule_no_hours": "A schedule needs at least one working day with hours.",
    "staff.schedule_invalid_range": "The schedule's validity ends before it starts."
  }
};

// ui/lib/domain-error.ts
var ERRORS = {
  es: es_default.errors ?? {},
  en: en_default.errors ?? {}
};
var PLACEHOLDER = /\{(\w+)\}/g;
function domainMessage(e5, lang, fallback, vars = {}) {
  if (!(e5 instanceof Error)) return fallback;
  const code = e5.code;
  if (typeof code === "string") {
    const translated = ERRORS[lang]?.[code] ?? ERRORS.en[code];
    const missing = translated ? [...translated.matchAll(PLACEHOLDER)].some(([, k2]) => !vars[k2]) : true;
    if (translated && !missing) return translated.replace(PLACEHOLDER, (_2, k2) => vars[k2]);
  }
  return e5.message || fallback;
}

// ui/lib/enums.ts
var CATALOG = { es: es_default, en: en_default };
function erplora() {
  const c5 = globalThis.erplora;
  if (!c5) throw new Error("erplora SDK no inicializado por el shell");
  return c5;
}
var MEMBER_STATUS_KEY = {
  active: "ui.status_active",
  inactive: "ui.status_inactive",
  on_leave: "ui.status_on_leave",
  terminated: "ui.status_terminated"
};
var LEAVE_TYPE_KEY = {
  vacation: "ui.leaveVacation",
  sick: "ui.leaveSick",
  personal: "ui.leavePersonal",
  training: "ui.leaveTraining",
  other: "ui.leaveOther"
};
var REQUEST_STATUS_KEY = {
  pending: "ui.statusPending",
  approved: "ui.statusApproved",
  rejected: "ui.statusRejected",
  cancelled: "ui.statusCancelled"
};
function enumLabel(keys, value) {
  const raw = value == null ? "" : String(value);
  const key = keys[raw];
  return key ? erplora().t(CATALOG, key) : raw;
}
function enumOptions(keys) {
  return Object.keys(keys).map((value) => ({ value, label: enumLabel(keys, value) }));
}
function formatDate(value) {
  const raw = value == null ? "" : String(value);
  const iso = raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return raw;
  const d3 = /* @__PURE__ */ new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d3.getTime())) return raw;
  try {
    return new Intl.DateTimeFormat(erplora().locale || "es", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC"
    }).format(d3);
  } catch {
    return iso;
  }
}

// ui/lib/hub-currency.ts
function hubDecimals() {
  const d3 = globalThis.erplora?.currencyDecimals;
  return typeof d3 === "number" && Number.isInteger(d3) && d3 >= 0 ? d3 : 2;
}
function majorToMinor2(major) {
  return majorToMinor(major, hubDecimals());
}
function minorToInput(minor) {
  if (minor == null) return "";
  const d3 = hubDecimals();
  return minorToMajor(minor, d3).toFixed(d3);
}
function moneyStep() {
  const d3 = hubDecimals();
  return d3 === 0 ? "1" : `0.${"0".repeat(d3 - 1)}1`;
}

// ui/components/erp-staff-members/erp-staff-members.ts
var CATALOG2 = { es: es_default, en: en_default };
var EMPTY_FORM = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  employee_id: "",
  role_id: "",
  user_id: "",
  status: "active",
  is_bookable: true,
  booking_buffer: "",
  color: "",
  hire_date: "",
  bio: "",
  specialties: "",
  hourly_rate: "",
  commission_rate: ""
};
var STATUS_OPTIONS = ["active", "inactive", "on_leave"];
function erplora2() {
  const c5 = globalThis.erplora;
  if (!c5) throw new Error("erplora SDK no inicializado por el shell");
  return c5;
}
var ErpStaffMembers = class extends i3 {
  constructor() {
    super(...arguments);
    this.roles = [];
    this.hubUsers = [];
    this.formError = "";
    this.pageError = "";
    this.form = { ...EMPTY_FORM };
    this.editingId = "";
    this.pendingAction = null;
    this.saving = false;
    this.memberServices = [];
    this.catalog = [];
    this.catalogUnavailable = false;
    this.newServiceId = "";
    this.newServiceDuration = "";
    this.newServicePrice = "";
    this.servicesError = "";
    this.rates = {};
    /** pm#459: ticket of the latest «edit» opening; anything that bumps it (a new edit, «Add»,
     *  reset) retires the replies still in flight. */
    this.editSeq = 0;
    this.onLocaleChange = () => this.requestUpdate();
  }
  static {
    this.styles = i`
    /* Cadena de altura: sin ella, el modo fill de la tabla no tiene alto que llenar. */
    :host { display:flex; flex-direction:column; height:100%; min-height:0; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    .page { display:flex; flex-direction:column; min-height:0; flex:1 1 auto; }
    .page > ok-data-table { flex:1 1 auto; min-height:0; }
    /* El alta vive en el panel lateral de la tabla: columna estrecha, no fila que se desborda. */
    .form { display:flex; flex-direction:column; gap:.7rem; }
    .form ion-button { align-self:flex-end; }
    .hint { margin:-.35rem 0 0; font-size:.8rem; line-height:1.35; color: var(--ion-color-medium, #6b6b6b); }
    .err { color:#d9480f; font-weight:600; }
    /* Two columns when the panel is wide enough (tablet/desktop), one on a phone. */
    .grid2 { display:grid; grid-template-columns:repeat(auto-fit, minmax(11rem, 1fr)); gap:.6rem; align-items:center; border-top:1px solid var(--ion-border-color, #e5e3dd); padding-top:.6rem; }
    .grid2 ion-textarea { grid-column:1 / -1; }
    /* Services performed (staff#9): a compact list inside the same panel, 44px rows for touch. */
    .services { display:flex; flex-direction:column; gap:.4rem; border-top:1px solid var(--ion-border-color, #e5e3dd); padding-top:.6rem; }
    .services h4 { margin:0; font-size:.85rem; font-weight:600; opacity:.8; }
    .services ul { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:.25rem; }
    .services li { display:flex; align-items:center; gap:.4rem; min-height:44px; }
    .services li .name { flex:1 1 auto; }
    .services li .meta { font-size:.75rem; opacity:.7; }
    .services .assign { display:flex; flex-wrap:wrap; gap:.4rem; align-items:center; }
    .services .assign ion-select { flex:1 1 100%; }
    .services .assign ion-input { flex:1 1 40%; }
    /* pm#392: color= is a document-level rule Ionic cannot apply inside this shadow root; the
       tone is read from the theme token here instead. */
    ion-button.tone-medium[fill] { --color: var(--ion-color-medium, #636469); }
    .hint { font-size:.8rem; opacity:.75; }
  `;
  }
  get canSeeCompensation() {
    return erplora2().hasPermission?.("staff.view_compensation") === true;
  }
  get columns() {
    const t5 = (k2) => erplora2().t(CATALOG2, k2);
    return [
      { key: "full_name", header: t5("ui.colName"), sortable: true, filterable: true, filterType: "text" },
      {
        key: "role_name",
        header: t5("ui.colRole"),
        sortable: true,
        filterable: true,
        // Dominio cerrado: el rol se ELIGE entre los roles reales, no se teclea (el servidor filtra
        // `role_name` por `eq`, así que el valor de la opción es el nombre, no el id).
        filterType: "select",
        options: this.roles.map((r6) => ({ value: r6.name, label: r6.name })),
        format: (r6) => r6.role_name || "\u2014"
      },
      { key: "email", header: t5("ui.colEmail"), sortable: true, filterable: true, filterType: "text" },
      // Hidden by default so the table fits an 834 px tablet without a horizontal scroll; the user
      // can turn it back on from the column picker (ok-data-table `hidden`).
      { key: "phone", header: t5("ui.colPhone"), sortable: true, filterable: true, filterType: "text", hidden: true },
      {
        key: "status",
        header: t5("ui.colStatus"),
        sortable: true,
        filterable: true,
        filterType: "select",
        // El filtro sigue ofreciendo el dominio OPERATIVO (quién está y quién no); la celda, en
        // cambio, tiene que saber nombrar los cuatro estados que la fila puede traer (staff#37).
        options: [
          { value: "active", label: enumLabel(MEMBER_STATUS_KEY, "active") },
          { value: "inactive", label: enumLabel(MEMBER_STATUS_KEY, "inactive") }
        ],
        format: (r6) => enumLabel(MEMBER_STATUS_KEY, r6.status)
      },
      // The rate column only exists for a session that may read it. Leaving it in place would print
      // «0,00 €» next to every colleague — «nobody earns anything» reads worse than no column.
      ...this.canSeeCompensation ? [{
        key: "hourly_rate",
        header: t5("ui.colHourlyRate"),
        align: "right",
        sortable: true,
        // Not server-filterable any more: the value no longer travels in the directory query.
        filterable: false,
        // Minor units per hour of the hub currency (ADR-0123) → formatMoney applies its scale.
        format: (r6) => erplora2().formatMoney(Number(this.rates[String(r6.id)] ?? 0))
      }] : []
    ];
  }
  get canDelete() {
    return erplora2().hasPermission?.("staff.delete_staff_member") === true;
  }
  get actions() {
    const t5 = (k2) => erplora2().t(CATALOG2, k2);
    const out = [{ id: "edit", label: t5("ui.actionEdit"), icon: "create-outline" }];
    if (this.canDelete) {
      out.push(
        { id: "deactivate", label: t5("ui.actionDeactivate"), icon: "pause-circle-outline", disabled: (r6) => r6.status !== "active" && r6.status !== "on_leave" },
        { id: "terminate", label: t5("ui.actionTerminate"), icon: "person-remove-outline", color: "danger" }
      );
    }
    return out;
  }
  /**
   * Panel header label (pm#450, outfitkit#150): the header now comes from `open('edit', { title })`.
   * This `newRecord` override is kept as the FALLBACK for shells running OutfitKit < 0.1.94, which
   * ignore that `title` and paint `newRecord` for the edit panel too (staff#38).
   *
   * In edit mode it carries the member's name, as Odoo, Dynamics 365 BC, Square Team and Fresha do:
   * the header identifies the record being touched, so nobody edits the wrong person.
   */
  get panelLabels() {
    const t5 = (k2, p4) => erplora2().t(CATALOG2, k2, p4);
    if (!this.editingId) return { newRecord: t5("ui.panelNew") };
    const name = `${this.form.first_name} ${this.form.last_name}`.trim();
    return { newRecord: t5("ui.panelEdit", { name }) };
  }
  /** Referencia al panel lateral de la tabla: «editar» lo abre relleno, guardar lo cierra. */
  dataTable() {
    return this.renderRoot.querySelector("ok-data-table");
  }
  async onRowAction(ev) {
    const m4 = ev.detail.row;
    if (ev.detail.actionId === "edit") {
      await this.openRecord(m4);
      return;
    }
    if (ev.detail.actionId === "deactivate" || ev.detail.actionId === "terminate") {
      this.pendingAction = { kind: ev.detail.actionId, id: m4.id, label: m4.full_name ?? `${m4.first_name} ${m4.last_name}` };
    }
  }
  /** Open the record in the panel: what the row carries first (instant), then the FULL record
   *  (`staff.members.get`) and, for a session that may read it, its compensation (staff#4). */
  async openRecord(m4) {
    const seq = ++this.editSeq;
    this.editingId = m4.id;
    this.formError = "";
    this.form = {
      ...EMPTY_FORM,
      first_name: m4.first_name ?? "",
      last_name: m4.last_name ?? "",
      email: m4.email ?? "",
      phone: m4.phone ?? "",
      role_id: m4.role_id ?? "",
      user_id: m4.user_id ?? "",
      status: m4.status ?? "active",
      is_bookable: m4.is_bookable === void 0 ? true : Number(m4.is_bookable) === 1
    };
    const name = `${this.form.first_name} ${this.form.last_name}`.trim();
    this.dataTable()?.open("edit", { title: erplora2().t(CATALOG2, "ui.panelEdit", { name }) });
    this.rememberLink(m4.id);
    void this.loadMemberServices();
    try {
      const [detail, comp] = await Promise.all([
        erplora2().query("staff.members.get", { staff_id: m4.id }),
        this.canSeeCompensation ? erplora2().query("staff.members.compensation", { staff_id: m4.id }) : Promise.resolve([])
      ]);
      if (seq !== this.editSeq || this.editingId !== m4.id) return;
      const d3 = detail?.[0];
      const c5 = comp?.[0];
      if (d3) {
        this.form = {
          ...this.form,
          first_name: d3.first_name,
          last_name: d3.last_name,
          email: d3.email ?? "",
          phone: d3.phone ?? "",
          employee_id: d3.employee_id ?? "",
          role_id: d3.role_id ?? "",
          user_id: d3.user_id ?? "",
          status: d3.status ?? "active",
          is_bookable: Number(d3.is_bookable) === 1,
          booking_buffer: d3.booking_buffer != null ? String(d3.booking_buffer) : "",
          color: d3.color ?? "",
          hire_date: d3.hire_date ?? "",
          bio: d3.bio ?? "",
          specialties: d3.specialties ?? ""
        };
      }
      if (c5) {
        this.form = {
          ...this.form,
          hourly_rate: minorToInput(Number(c5.hourly_rate || 0)),
          commission_rate: String(Number(c5.commission_rate || 0))
        };
      }
    } catch (e5) {
      if (seq !== this.editSeq) return;
      this.formError = domainMessage(e5, erplora2().locale, erplora2().t(CATALOG2, "ui.errLoadMember"));
    }
  }
  /** A record is linkable (staff#4): `?member=<id>` in the URL opens it, and opening one writes it. */
  rememberLink(id) {
    try {
      const url = new URL(window.location.href);
      if (id) url.searchParams.set("member", id);
      else url.searchParams.delete("member");
      window.history.replaceState(window.history.state, "", url.toString());
    } catch {
    }
  }
  linkedMemberId() {
    try {
      return new URLSearchParams(window.location.search).get("member") ?? "";
    } catch {
      return "";
    }
  }
  patch(p4) {
    this.form = { ...this.form, ...p4 };
  }
  /** The alert decided (staff#4). Terminate carries the values typed in the alert inputs. */
  async onActionDismiss(ev) {
    const pending = this.pendingAction;
    this.pendingAction = null;
    if (ev.detail?.role !== "confirm" || !pending) return;
    this.pageError = "";
    try {
      if (pending.kind === "deactivate") {
        await erplora2().command("staff.members.deactivate", { staff_id: pending.id });
      } else {
        const values = ev.detail?.data?.values ?? {};
        await erplora2().command("staff.members.delete", {
          staff_id: pending.id,
          termination_date: values.termination_date || null,
          reason: values.reason || null
        });
      }
      if (this.editingId === pending.id) this.resetForm();
      await this.ctrl.load();
    } catch (e5) {
      this.pageError = domainMessage(e5, erplora2().locale, erplora2().t(CATALOG2, "ui.errLifecycle"));
    }
  }
  resetForm() {
    this.editSeq++;
    this.editingId = "";
    this.formError = "";
    this.servicesError = "";
    this.form = { ...EMPTY_FORM };
    this.memberServices = [];
    this.rememberLink("");
  }
  /** pm#450: the table's «Add» emits no event and keeps our form state; after an edit it would
   *  show the edited member under a «New» header, and the submit would UPDATE it. */
  onTableClick(e5) {
    const addId = "staff-members-table-add";
    if (!e5.composedPath().some((n6) => n6 instanceof HTMLElement && n6.dataset.testid === addId)) return;
    if (this.editingId) this.resetForm();
    else this.editSeq++;
  }
  /** Wired natively, not with a Lit `@click` on the tag: `<ok-data-table>` carries `testid`, not
   *  `data-testid` (outfitkit#143), and a template binding would read as an action element that
   *  demands one. */
  firstUpdated() {
    const table = this.renderRoot.querySelector("ok-data-table");
    table?.addEventListener("click", (e5) => this.onTableClick(e5));
    table?.addEventListener("panelClose", () => this.editSeq++);
  }
  /** Competencies + catalogue for the member being edited. The catalogue comes from the PUBLIC
   *  query of `services`; a failure there (module not installed, no permission) is NOT an error
   *  of this screen: the section degrades to a hint and the record stays editable. */
  async loadMemberServices() {
    if (!this.editingId) return;
    this.servicesError = "";
    const staffId = this.editingId;
    const seq = this.editSeq;
    let own = [];
    let cat = [];
    let failure = null;
    try {
      [own, cat] = await Promise.all([
        erplora2().query("staff.services.list_for_member", { staff_id: staffId }),
        erplora2().queryOptional("services.services.list", { limit: 500 })
      ]);
    } catch (e5) {
      failure = e5;
    }
    if (seq !== this.editSeq || this.editingId !== staffId) return;
    if (failure) {
      this.servicesError = domainMessage(failure, erplora2().locale, erplora2().t(CATALOG2, "ui.errAssignService"));
    }
    this.memberServices = own ?? [];
    this.catalog = cat ?? [];
    this.catalogUnavailable = cat === void 0;
  }
  /** Catalogue entries not yet assigned to this member (what the picker offers). */
  get assignableServices() {
    const have = new Set(this.memberServices.map((s5) => s5.service_id));
    return this.catalog.filter((c5) => !have.has(c5.id));
  }
  /** Assign: opaque `service_id` + name snapshot; overrides only when typed (null = catalogue). */
  async assignService(ev) {
    ev.preventDefault();
    const svc = this.catalog.find((c5) => c5.id === this.newServiceId);
    if (!this.editingId || !svc) return;
    const minutes = parseInt(this.newServiceDuration, 10);
    const price = String(this.newServicePrice).replace(",", ".");
    const major = parseFloat(price);
    this.servicesError = "";
    try {
      await erplora2().command("staff.services.assign", {
        staff_id: this.editingId,
        service_id: svc.id,
        service_name: svc.name,
        custom_duration: Number.isFinite(minutes) && minutes > 0 ? minutes : null,
        custom_price: Number.isFinite(major) && major >= 0 && this.newServicePrice !== "" ? majorToMinor2(price) : null,
        is_primary: 0
      });
      this.newServiceId = "";
      this.newServiceDuration = "";
      this.newServicePrice = "";
      await this.loadMemberServices();
    } catch (e5) {
      this.servicesError = domainMessage(e5, erplora2().locale, erplora2().t(CATALOG2, "ui.errAssignService"));
    }
  }
  async removeService(id) {
    this.servicesError = "";
    try {
      await erplora2().command("staff.services.remove", { id });
      await this.loadMemberServices();
    } catch (e5) {
      this.servicesError = domainMessage(e5, erplora2().locale, erplora2().t(CATALOG2, "ui.errAssignService"));
    }
  }
  /** Mark as the member's primary service (the command demotes the previous one). */
  async setPrimaryService(row) {
    const current = this.memberServices.find((s5) => s5.id === row.id);
    this.servicesError = "";
    try {
      await erplora2().command("staff.services.update", {
        id: row.id,
        custom_duration: current?.custom_duration ?? null,
        custom_price: current?.custom_price ?? null,
        is_primary: 1,
        is_active: current?.is_active ?? 1
      });
      await this.loadMemberServices();
    } catch (e5) {
      this.servicesError = domainMessage(e5, erplora2().locale, erplora2().t(CATALOG2, "ui.errAssignService"));
    }
  }
  renderServices() {
    const t5 = (k2) => erplora2().t(CATALOG2, k2);
    if (!this.editingId) return A;
    return b2`<section class="services" data-section="services">
      <h4>${t5("ui.servicesTitle")}</h4>
      ${this.servicesError ? b2`<div data-testid="staff-members-services-error" class="err">${this.servicesError}</div>` : A}
      ${this.memberServices.length === 0 ? b2`<div data-testid="staff-members-services-empty" class="hint">${t5("ui.servicesEmpty")}</div>` : A}
      <ul>
        ${this.memberServices.map((s5) => b2`<li>
          <ion-icon data-testid=${`staff-members-service-primary-${s5.service_id}`} name=${s5.is_primary ? "star" : "star-outline"} title=${t5("ui.servicePrimary")} aria-label=${t5("ui.servicePrimary")} role="button" tabindex="0" @click=${() => s5.is_primary ? void 0 : this.setPrimaryService(s5)}></ion-icon>
          <span class="name">${s5.service_name}</span>
          <span class="meta">${s5.custom_duration ? `${s5.custom_duration} min` : ""}${s5.custom_duration && s5.custom_price != null ? " \xB7 " : ""}${s5.custom_price != null ? erplora2().formatMoney(Number(s5.custom_price)) : ""}</span>
          <ion-button data-testid=${`staff-members-service-remove-${s5.service_id}`} fill="clear" size="small" class="tone-medium" data-action="remove-service" aria-label=${t5("ui.serviceRemove")} @click=${() => this.removeService(s5.id)}><ion-icon slot="icon-only" name="close-outline"></ion-icon></ion-button>
        </li>`)}
      </ul>
      ${this.catalogUnavailable ? b2`<div data-testid="staff-members-services-no-catalog" class="hint" data-hint="no-catalog">${t5("ui.servicesNoCatalog")}</div>` : b2`<div class="assign">
            <ion-select data-testid="staff-members-service-add" mode="md" fill="outline" label-placement="floating" label=${t5("ui.serviceAdd")} .value=${this.newServiceId} @ionChange=${(e5) => this.newServiceId = e5.target.value}>
              ${this.assignableServices.map((c5) => b2`<ion-select-option .value=${c5.id}>${c5.name}</ion-select-option>`)}
            </ion-select>
            <ion-input data-testid="staff-members-service-duration" mode="md" fill="outline" label-placement="floating" type="number" inputmode="numeric" min="1" label=${t5("ui.serviceDuration")} .value=${this.newServiceDuration} @ionInput=${(e5) => this.newServiceDuration = e5.target.value}></ion-input>
            <ion-input data-testid="staff-members-service-price" mode="md" fill="outline" label-placement="floating" type="number" inputmode="decimal" min="0" step=${moneyStep()} label=${t5("ui.servicePrice")} .value=${this.newServicePrice} @ionInput=${(e5) => this.newServicePrice = e5.target.value}></ion-input>
            <ion-button data-testid="staff-members-service-assign" size="small" fill="outline" ?disabled=${!this.newServiceId} @click=${(e5) => this.assignService(e5)}>${t5("ui.serviceAssign")}</ion-button>
          </div>`}
    </section>`;
  }
  /** Compensation, only for a session that may read it. A denied query is NOT an error to show:
   *  the column simply does not exist for that session, and the directory keeps working. */
  async loadRates() {
    if (!this.canSeeCompensation) return;
    try {
      const rows = await erplora2().query(
        "staff.members.compensation",
        { staff_id: "" }
      );
      this.rates = Object.fromEntries((rows ?? []).map((r6) => [String(r6.id), Number(r6.hourly_rate || 0)]));
    } catch {
      this.rates = {};
    }
  }
  // TODO-LIT: componentWillLoad → connectedCallback. Recuerda: connectedCallback se dispara
  // en CADA reconexión al DOM (no solo en el primer montaje). Si la init debe correr una
  // sola vez tras el primer render, considera firstUpdated() en su lugar.
  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener("erplora:locale-changed", this.onLocaleChange);
    this.ctrl = createListController(erplora2(), "staff.members.list", () => this.requestUpdate(), {
      pageSize: 50,
      sort: "id",
      dir: "asc"
    });
    await Promise.all([this.ctrl.load(), this.loadRoles(), this.loadHubUsers(), this.loadRates()]);
    const linked = this.linkedMemberId();
    if (linked) {
      const row = this.ctrl.rows.find((r6) => r6.id === linked);
      void this.openRecord(row ?? { id: linked });
    }
    try {
      const off1 = erplora2().on("staff.member.created", () => this.ctrl.load());
      const off2 = erplora2().on("staff.member.updated", () => this.ctrl.load());
      const off3 = erplora2().on("staff.member.terminated", () => this.ctrl.load());
      const off4 = erplora2().on("staff.member.deactivated", () => this.ctrl.load());
      this.unsub = () => {
        off1();
        off2();
        off3();
        off4();
      };
    } catch {
    }
  }
  disconnectedCallback() {
    window.removeEventListener("erplora:locale-changed", this.onLocaleChange);
    super.disconnectedCallback();
    this.unsub?.();
  }
  async loadRoles() {
    try {
      this.roles = await erplora2().query("staff.roles.list") ?? [];
    } catch {
    }
  }
  /** Usuarios del Hub para el selector. Solo los ACTIVOS: a un usuario de baja no se le asignan
   *  fichas nuevas. Si el core no responde, el selector queda vacío y la ficha se crea sin vínculo
   *  (el vínculo es opcional, no puede bloquear el alta). */
  async loadHubUsers() {
    try {
      const users = await erplora2().query("hub.users.list") ?? [];
      this.hubUsers = users.filter((u5) => u5.is_active);
    } catch {
    }
  }
  /** staff#55: a Hub user hangs from ONE record, and the refusal has to name the record that holds
   *  it. The error carries only the code, so the holder is read here; if that read fails, the
   *  message falls back to the runtime's sentence (which names it too, in English). */
  async linkHolderVars(e5, userId) {
    if (e5?.code !== "staff.user_already_linked" || !userId) return {};
    try {
      const rows = await erplora2().query(
        "staff.members.by_user",
        { user_id: userId }
      );
      const holder = rows[0];
      return holder ? { name: `${holder.first_name} ${holder.last_name}`.trim() } : {};
    } catch {
      return {};
    }
  }
  /** Alta y edición comparten panel: `editingId` decide el comando (create ↔ update). The update
   *  is a FULL snapshot of what the form shows (staff#4): `''` clears role/user, money in the hub currency's minor unit,
   *  commission as %; compensation only travels when the session could read it (otherwise it would
   *  overwrite what it never saw). */
  async createMember(ev) {
    ev.preventDefault();
    const f3 = this.form;
    if (!f3.first_name.trim() || !f3.last_name.trim()) return;
    this.saving = true;
    this.formError = "";
    const buffer = parseInt(f3.booking_buffer, 10);
    const commission = parseFloat(String(f3.commission_rate).replace(",", "."));
    const common = {
      first_name: f3.first_name.trim(),
      last_name: f3.last_name.trim(),
      email: f3.email.trim(),
      phone: f3.phone.trim(),
      employee_id: f3.employee_id.trim(),
      status: f3.status || "active",
      is_bookable: f3.is_bookable ? 1 : 0,
      color: f3.color.trim(),
      hire_date: f3.hire_date || null,
      bio: f3.bio,
      specialties: f3.specialties
    };
    if (this.canSeeCompensation) {
      common.hourly_rate = majorToMinor2(String(f3.hourly_rate).replace(",", "."));
      common.commission_rate = Number.isFinite(commission) ? commission : 0;
    }
    try {
      if (this.editingId) {
        await erplora2().command("staff.members.update", {
          staff_id: this.editingId,
          ...common,
          // '' CLEARS role and user; null would mean «keep» (COALESCE/CASE of the command).
          role_id: f3.role_id,
          user_id: f3.user_id,
          booking_buffer: Number.isFinite(buffer) ? buffer : 0
        });
      } else {
        await erplora2().command("staff.members.create", {
          ...common,
          role_id: f3.role_id || null,
          user_id: f3.user_id || null,
          notes: ""
        });
      }
      this.resetForm();
      this.dataTable()?.close();
      await Promise.all([this.ctrl.load(), this.loadRates()]);
    } catch (e5) {
      const vars = await this.linkHolderVars(e5, f3.user_id);
      this.formError = domainMessage(e5, erplora2().locale, erplora2().t(CATALOG2, "ui.errCreateMember"), vars);
    } finally {
      this.saving = false;
    }
  }
  render() {
    const t5 = (k2) => erplora2().t(CATALOG2, k2);
    return b2`<div class="page">
        ${this.pageError ? b2`<ok-inline-feedback data-testid="staff-members-page-error" tone="danger" icon="alert-circle-outline">${this.pageError}</ok-inline-feedback>` : A}
        ${this.ctrl?.error ? b2`<ok-inline-feedback data-testid="staff-members-load-error" tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : A}
        <!-- The «Edit» button is not the only door: rowClickable makes the whole row open the
             same record panel (outfitkit#67 — the actions column can be off-screen at 1440 px). -->
        <ok-data-table testid="staff-members-table" .serverSide=${true} .fill=${true} .addable=${true} .labels=${this.panelLabels} .columns=${this.columns} .views=${true} .cardTitle=${(r6) => String(r6.full_name ?? "\u2014")} .cardIcon=${() => "person-outline"} .actions=${this.actions} .rowClickable=${true} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? "asc"} .searchable=${true} .searchPlaceholder=${t5("ui.searchMember")} .emptyMessage=${this.ctrl?.loading ? t5("ui.loading") : t5("ui.emptyMembers")} @rowAction=${(e5) => this.onRowAction(e5)} @rowClick=${(e5) => this.onRowAction({ detail: { actionId: "edit", row: e5.detail.row } })} @pageChange=${(e5) => this.ctrl.setPage(e5.detail)} @sortChange=${(e5) => this.ctrl.setSort(e5.detail.sort, e5.detail.dir)} @searchChange=${(e5) => this.ctrl.setSearch(e5.detail)} @filterChange=${(e5) => this.ctrl.setFilter(e5.detail.col, e5.detail.value)}>
          <!-- El formulario se proyecta SIEMPRE en el panel: si solo se pintara al abrirlo, el «+»
               abriría un panel vacío (la tabla no re-renderiza a sus hijos de luz). -->
          <form data-testid="staff-members-form" slot="create" class="form" @submit=${(e5) => this.createMember(e5)}>
            <ion-input data-testid="staff-members-first-name" mode="md" fill="outline" label-placement="floating" label=${t5("ui.phFirstName")} .value=${this.form.first_name} @ionInput=${(e5) => this.patch({ first_name: e5.target.value })}></ion-input>
            <ion-input data-testid="staff-members-last-name" mode="md" fill="outline" label-placement="floating" label=${t5("ui.phLastName")} .value=${this.form.last_name} @ionInput=${(e5) => this.patch({ last_name: e5.target.value })}></ion-input>
            <ion-input data-testid="staff-members-email" mode="md" fill="outline" label-placement="floating" type="email" label=${t5("ui.phEmail")} .value=${this.form.email} @ionInput=${(e5) => this.patch({ email: e5.target.value })}></ion-input>
            <ion-input data-testid="staff-members-phone" mode="md" fill="outline" label-placement="floating" type="tel" label=${t5("ui.colPhone")} .value=${this.form.phone} @ionInput=${(e5) => this.patch({ phone: e5.target.value })}></ion-input>
            <ion-input data-testid="staff-members-employee-id" mode="md" fill="outline" label-placement="floating" label=${t5("ui.employeeId")} .value=${this.form.employee_id} @ionInput=${(e5) => this.patch({ employee_id: e5.target.value })}></ion-input>
            <ion-select data-testid="staff-members-role" mode="md" fill="outline" label-placement="floating" label=${t5("ui.colRole")} .value=${this.form.role_id} @ionChange=${(e5) => this.patch({ role_id: e5.target.value ?? "" })}><ion-select-option .value=${""}>${t5("ui.roleNone")}</ion-select-option>${this.roles.map((r6) => b2`<ion-select-option .value=${r6.id}>${r6.name}</ion-select-option>`)}</ion-select>
            <ion-select data-testid="staff-members-hub-user" mode="md" fill="outline" label-placement="floating" label=${t5("ui.hubUser")} .value=${this.form.user_id} @ionChange=${(e5) => this.patch({ user_id: e5.target.value ?? "" })}><ion-select-option .value=${""}>${t5("ui.hubUserNone")}</ion-select-option>${this.hubUsers.map((u5) => b2`<ion-select-option .value=${u5.id}>${u5.name}</ion-select-option>`)}</ion-select>
            <!-- staff#46: without a link, what this person charges at the COUNTER is attributed to
                 the session user, not to their record, and does not count towards their commission.
                 Nobody is preselected: guessing the user ties one person's payroll to another's session. -->
            ${this.form.user_id ? A : b2`<p data-testid="staff-members-hub-user-hint" class="hint" data-hint="hub-user">${t5("ui.hubUserWhyLink")}</p>`}
            <!-- Operation (staff#4): status and bookable are EXPLICIT controls; terminated is not an option. -->
            <section data-section="operation" class="grid2">
              ${this.editingId ? b2`<ion-select data-testid="staff-members-status" mode="md" fill="outline" label-placement="floating" label=${t5("ui.colStatus")} .value=${this.form.status} @ionChange=${(e5) => this.patch({ status: e5.target.value })}>${STATUS_OPTIONS.map((st) => b2`<ion-select-option .value=${st}>${enumLabel(MEMBER_STATUS_KEY, st)}</ion-select-option>`)}</ion-select>` : A}
              <ion-toggle data-testid="staff-members-bookable" label-placement="end" .checked=${this.form.is_bookable} @ionChange=${(e5) => this.patch({ is_bookable: !!e5.detail.checked })}>${t5("ui.bookable")}</ion-toggle>
              <ion-input data-testid="staff-members-booking-buffer" mode="md" fill="outline" label-placement="floating" type="number" inputmode="numeric" min="0" label=${t5("ui.bookingBuffer")} .value=${this.form.booking_buffer} @ionInput=${(e5) => this.patch({ booking_buffer: e5.target.value })}></ion-input>
              <ion-input data-testid="staff-members-hire-date" mode="md" fill="outline" label-placement="floating" type="date" label=${t5("ui.hireDate")} .value=${this.form.hire_date} @ionInput=${(e5) => this.patch({ hire_date: e5.target.value })}></ion-input>
              <ion-input data-testid="staff-members-color" mode="md" fill="outline" label-placement="floating" type="color" label=${t5("ui.colColor")} .value=${this.form.color || "#000000"} @ionInput=${(e5) => this.patch({ color: e5.target.value })}></ion-input>
              <ion-input data-testid="staff-members-specialties" mode="md" fill="outline" label-placement="floating" label=${t5("ui.specialties")} .value=${this.form.specialties} @ionInput=${(e5) => this.patch({ specialties: e5.target.value })}></ion-input>
              <ion-textarea data-testid="staff-members-bio" mode="md" fill="outline" label-placement="floating" auto-grow label=${t5("ui.bio")} .value=${this.form.bio} @ionInput=${(e5) => this.patch({ bio: e5.target.value })}></ion-textarea>
            </section>
            <!-- Compensation: PRIVATE — only for a session that may read it (staff#10 / staff#4). -->
            ${this.canSeeCompensation ? b2`<section data-section="compensation" class="grid2">
                  <ion-input data-testid="staff-members-hourly-rate" mode="md" fill="outline" label-placement="floating" type="number" inputmode="decimal" min="0" step=${moneyStep()} label=${t5("ui.hourlyRate")} .value=${this.form.hourly_rate} @ionInput=${(e5) => this.patch({ hourly_rate: e5.target.value })}></ion-input>
                  <ion-input data-testid="staff-members-commission-rate" mode="md" fill="outline" label-placement="floating" type="number" inputmode="decimal" min="0" max="100" step="0.1" label=${t5("ui.commissionPct")} .value=${this.form.commission_rate} @ionInput=${(e5) => this.patch({ commission_rate: e5.target.value })}></ion-input>
                </section>` : A}
            ${this.renderServices()}
            <!-- staff#72: the refusal travels WITH the form — on a phone the panel is a full-screen
                 sheet and a banner on the page underneath it is never seen. -->
            ${this.formError ? b2`<ok-inline-feedback data-testid="staff-members-form-error" tone="danger" icon="alert-circle-outline">${this.formError}</ok-inline-feedback>` : A}
            <ion-button data-testid="staff-members-submit" type="submit" size="small" ?disabled=${this.saving || !this.form.first_name || !this.form.last_name}>${this.saving ? t5("ui.actionSaving") : this.editingId ? t5("ui.actionSave") : t5("ui.actionAdd")}</ion-button>
          </form>
        </ok-data-table>
        <ion-alert
          data-testid="staff-members-action-alert"
          .isOpen=${this.pendingAction !== null}
          header=${this.pendingAction?.kind === "terminate" ? t5("ui.terminateTitle") : t5("ui.deactivateTitle")}
          message=${erplora2().t(CATALOG2, this.pendingAction?.kind === "terminate" ? "ui.terminateMessage" : "ui.deactivateMessage", { name: this.pendingAction?.label ?? "" })}
          .inputs=${this.pendingAction?.kind === "terminate" ? [
      { name: "termination_date", type: "date", label: t5("ui.terminationDate"), attributes: { "data-testid": "staff-members-terminate-date" } },
      { name: "reason", type: "text", placeholder: t5("ui.terminationReason"), attributes: { "data-testid": "staff-members-terminate-reason" } }
    ] : []}
          .buttons=${[
      { text: t5("ui.cancel"), role: "cancel", htmlAttributes: { "data-testid": "staff-members-action-cancel" } },
      { text: this.pendingAction?.kind === "terminate" ? t5("ui.actionTerminate") : t5("ui.actionDeactivate"), role: "confirm", cssClass: "alert-button-danger", htmlAttributes: { "data-testid": "staff-members-action-confirm" } }
    ]}
          @ionAlertDidDismiss=${(e5) => this.onActionDismiss(e5)}
        ></ion-alert>
      </div>`;
  }
};
__decorateClass([
  r5()
], ErpStaffMembers.prototype, "roles", 2);
__decorateClass([
  r5()
], ErpStaffMembers.prototype, "hubUsers", 2);
__decorateClass([
  r5()
], ErpStaffMembers.prototype, "formError", 2);
__decorateClass([
  r5()
], ErpStaffMembers.prototype, "pageError", 2);
__decorateClass([
  r5()
], ErpStaffMembers.prototype, "form", 2);
__decorateClass([
  r5()
], ErpStaffMembers.prototype, "editingId", 2);
__decorateClass([
  r5()
], ErpStaffMembers.prototype, "pendingAction", 2);
__decorateClass([
  r5()
], ErpStaffMembers.prototype, "saving", 2);
__decorateClass([
  r5()
], ErpStaffMembers.prototype, "memberServices", 2);
__decorateClass([
  r5()
], ErpStaffMembers.prototype, "catalog", 2);
__decorateClass([
  r5()
], ErpStaffMembers.prototype, "catalogUnavailable", 2);
__decorateClass([
  r5()
], ErpStaffMembers.prototype, "newServiceId", 2);
__decorateClass([
  r5()
], ErpStaffMembers.prototype, "newServiceDuration", 2);
__decorateClass([
  r5()
], ErpStaffMembers.prototype, "newServicePrice", 2);
__decorateClass([
  r5()
], ErpStaffMembers.prototype, "servicesError", 2);
__decorateClass([
  r5()
], ErpStaffMembers.prototype, "rates", 2);
define("erp-staff-members", ErpStaffMembers);

// ui/components/erp-staff-roles/erp-staff-roles.ts
var CATALOG3 = { es: es_default, en: en_default };
function erplora3() {
  const c5 = globalThis.erplora;
  if (!c5) throw new Error("erplora SDK no inicializado por el shell");
  return c5;
}
var ErpStaffRoles = class extends i3 {
  constructor() {
    super(...arguments);
    this.formError = "";
    this.newName = "";
    this.newDesc = "";
    this.newColor = "";
    this.saving = false;
    this.onLocaleChange = () => this.requestUpdate();
  }
  static {
    this.styles = i`
    /* Cadena de altura: sin ella, el modo fill de la tabla no tiene alto que llenar. */
    :host { display:flex; flex-direction:column; height:100%; min-height:0; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    .page { display:flex; flex-direction:column; min-height:0; flex:1 1 auto; }
    .page > ok-data-table { flex:1 1 auto; min-height:0; }
    /* El alta vive en el panel lateral de la tabla: columna estrecha, no fila que se desborda. */
    .form { display:flex; flex-direction:column; gap:.7rem; }
    .form ion-button { align-self:flex-end; }
    .err { color:#d9480f; font-weight:600; }
  `;
  }
  get columns() {
    const t5 = (k2) => erplora3().t(CATALOG3, k2);
    return [
      { key: "name", header: t5("ui.colRole"), sortable: true, filterable: true, filterType: "text" },
      { key: "description", header: t5("ui.colDescription"), sortable: true, filterable: true, filterType: "text" },
      { key: "member_count", header: t5("ui.colMembers"), align: "right", sortable: true, filterable: true, filterType: "range" }
    ];
  }
  // TODO-LIT: componentWillLoad → connectedCallback. Recuerda: connectedCallback se dispara
  // en CADA reconexión al DOM (no solo en el primer montaje). Si la init debe correr una
  // sola vez tras el primer render, considera firstUpdated() en su lugar.
  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener("erplora:locale-changed", this.onLocaleChange);
    this.ctrl = createListController(erplora3(), "staff.roles.list", () => this.requestUpdate(), {
      pageSize: 50,
      sort: "name",
      dir: "asc"
    });
    await this.ctrl.load();
    try {
      this.unsub = erplora3().on("staff.role.created", () => this.ctrl.load());
    } catch {
    }
  }
  disconnectedCallback() {
    window.removeEventListener("erplora:locale-changed", this.onLocaleChange);
    super.disconnectedCallback();
    this.unsub?.();
  }
  /** Referencia al panel lateral de la tabla: guardar lo cierra. */
  dataTable() {
    return this.renderRoot.querySelector("ok-data-table");
  }
  async createRole(ev) {
    ev.preventDefault();
    if (!this.newName.trim()) return;
    this.saving = true;
    this.formError = "";
    try {
      await erplora3().command("staff.roles.create", {
        name: this.newName.trim(),
        description: this.newDesc.trim(),
        color: this.newColor.trim(),
        order: 0
      });
      this.newName = "";
      this.newDesc = "";
      this.newColor = "";
      this.dataTable()?.close();
      await this.ctrl.load();
    } catch (e5) {
      this.formError = e5 instanceof Error ? e5.message : erplora3().t(CATALOG3, "ui.errCreateRole");
    } finally {
      this.saving = false;
    }
  }
  render() {
    const t5 = (k2) => erplora3().t(CATALOG3, k2);
    return b2`<div class="page">
        ${this.ctrl?.error ? b2`<ok-inline-feedback data-testid="staff-roles-load-error" tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : A}
        <ok-data-table testid="staff-roles-table" .serverSide=${true} .fill=${true} .addable=${true} .columns=${this.columns} .views=${true} .cardTitle=${(r6) => String(r6.name ?? "\u2014")} .cardIcon=${() => "shield-outline"} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? "asc"} .searchable=${true} .searchPlaceholder=${t5("ui.searchRole")} .emptyMessage=${this.ctrl?.loading ? t5("ui.loading") : t5("ui.emptyRoles")} @pageChange=${(e5) => this.ctrl.setPage(e5.detail)} @sortChange=${(e5) => this.ctrl.setSort(e5.detail.sort, e5.detail.dir)} @searchChange=${(e5) => this.ctrl.setSearch(e5.detail)} @filterChange=${(e5) => this.ctrl.setFilter(e5.detail.col, e5.detail.value)}>
          <!-- El formulario se proyecta SIEMPRE en el panel: si solo se pintara al abrirlo, el «+»
               abriría un panel vacío (la tabla no re-renderiza a sus hijos de luz). -->
          <form data-testid="staff-roles-form" slot="create" class="form" @submit=${(e5) => this.createRole(e5)}>
            <ion-input data-testid="staff-roles-name" mode="md" fill="outline" label-placement="floating" label=${t5("ui.phRoleName")} .value=${this.newName} @ionInput=${(e5) => this.newName = e5.target.value}></ion-input>
            <ion-input data-testid="staff-roles-description" mode="md" fill="outline" label-placement="floating" label=${t5("ui.phDescription")} .value=${this.newDesc} @ionInput=${(e5) => this.newDesc = e5.target.value}></ion-input>
            <ion-input data-testid="staff-roles-color" mode="md" fill="outline" label-placement="floating" label=${t5("ui.colColor")} placeholder=${t5("ui.phColor")} .value=${this.newColor} @ionInput=${(e5) => this.newColor = e5.target.value}></ion-input>
            <!-- staff#72: the refusal travels WITH the form — on a phone the panel is a full-screen sheet
                 and a banner on the page underneath it is never seen. -->
            ${this.formError ? b2`<ok-inline-feedback data-testid="staff-roles-form-error" tone="danger" icon="alert-circle-outline">${this.formError}</ok-inline-feedback>` : A}
            <ion-button data-testid="staff-roles-submit" type="submit" size="small" ?disabled=${this.saving || !this.newName}>${this.saving ? t5("ui.actionSaving") : t5("ui.actionAdd")}</ion-button>
          </form>
        </ok-data-table>
      </div>`;
  }
};
__decorateClass([
  r5()
], ErpStaffRoles.prototype, "formError", 2);
__decorateClass([
  r5()
], ErpStaffRoles.prototype, "newName", 2);
__decorateClass([
  r5()
], ErpStaffRoles.prototype, "newDesc", 2);
__decorateClass([
  r5()
], ErpStaffRoles.prototype, "newColor", 2);
__decorateClass([
  r5()
], ErpStaffRoles.prototype, "saving", 2);
define("erp-staff-roles", ErpStaffRoles);

// ui/components/erp-staff-schedules/erp-staff-schedules.ts
var CATALOG4 = { es: es_default, en: en_default };
var hhmm = (t5) => t5 ? String(t5).slice(0, 5) : "";
var DAY_KEYS = ["ui.dayMonday", "ui.dayTuesday", "ui.dayWednesday", "ui.dayThursday", "ui.dayFriday", "ui.daySaturday", "ui.daySunday"];
function defaultWeek() {
  return DAY_KEYS.map((_key, day) => ({
    day,
    working: day < 5,
    // L-V por defecto
    start: "09:00",
    end: "18:00",
    breakStart: "",
    breakEnd: ""
  }));
}
function erplora4() {
  const c5 = globalThis.erplora;
  if (!c5) throw new Error("erplora SDK no inicializado por el shell");
  return c5;
}
var ErpStaffSchedules = class extends i3 {
  constructor() {
    super(...arguments);
    this.members = [];
    this.staffId = "";
    this.schedules = [];
    this.loading = false;
    this.formError = "";
    this.pageError = "";
    this.saving = false;
    this.newName = "";
    this.newDefault = true;
    this.effectiveFrom = "";
    this.effectiveUntil = "";
    this.week = defaultWeek();
    this.hours = [];
    this.editingId = "";
    this.pendingDelete = null;
    this.onLocaleChange = () => this.requestUpdate();
  }
  static {
    this.styles = i`
    /* Cadena de altura: sin ella, el modo fill de la tabla no tiene alto que llenar. */
    :host { display:flex; flex-direction:column; height:100%; min-height:0; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    .page { display:flex; flex-direction:column; min-height:0; flex:1 1 auto; }
    .page > ok-data-table { flex:1 1 auto; min-height:0; }
    header { display:flex; gap:.5rem; align-items:center; margin-bottom:.75rem; flex-wrap:wrap; }
    /* El alta vive en el panel lateral de la tabla: columna estrecha, no fila que se desborda. */
    .form { display:flex; flex-direction:column; gap:.7rem; }
    .form ion-button { align-self:flex-end; }
    header ion-select { flex:1 1 11rem; min-width:9rem; }
    .week { display:flex; flex-direction:column; gap:.25rem; margin:.25rem 0; }
    .day { display:flex; gap:.5rem; align-items:center; flex-wrap:wrap; }
    /* El nombre del día es la LABEL del checkbox (va slotteada dentro de él): así el texto es
       clicable y da nombre accesible al input. Ionic trunca esa label (white-space:nowrap en su
       shadow) → se vence por el shadow part, no con .ion-text-wrap. */
    .day ion-checkbox::part(label) { white-space:normal; }
    .day .name { display:block; width:6.5rem; font-weight:600; }
    .day ion-input { max-width:8rem; }
    .day .sep { color:var(--ion-color-medium,#6f6a5e); font-size:.85rem; }
    .err { color:#d9480f; font-weight:600; }
    .hint { color:var(--ion-color-medium,#6f6a5e); font-size:.9rem; }
  `;
  }
  get columns() {
    const t5 = (k2) => erplora4().t(CATALOG4, k2);
    return [
      { key: "name", header: t5("ui.colSchedule"), sortable: true },
      { key: "is_default", header: t5("ui.colDefault"), sortable: true, format: (r6) => Number(r6.is_default) ? t5("ui.valYes") : "\u2014" },
      { key: "effective_from", header: t5("ui.colFrom"), sortable: true, format: (r6) => formatDate(r6.effective_from) || "\u2014" },
      { key: "effective_until", header: t5("ui.colTo"), sortable: true, format: (r6) => formatDate(r6.effective_until) || "\u2014" },
      { key: "is_active", header: t5("ui.colActive"), sortable: true, format: (r6) => Number(r6.is_active) ? t5("ui.valYes") : t5("ui.valNo") },
      // The week at a glance (staff#2): «Mon 09:00-18:00 (13:00-14:00) · Wed 10:00-16:00».
      { key: "hours", header: t5("ui.colHours"), sortable: false, format: (r6) => this.hoursSummary(String(r6.id)) }
    ];
  }
  get actions() {
    const t5 = (k2) => erplora4().t(CATALOG4, k2);
    return [
      { id: "edit", label: t5("ui.actionEdit"), icon: "create-outline" },
      { id: "toggle", label: t5("ui.actionToggleActive"), icon: "power-outline" },
      { id: "delete", label: t5("ui.actionDelete"), icon: "trash-outline", color: "danger" }
    ];
  }
  hoursSummary(scheduleId) {
    const rows = this.hours.filter((h4) => h4.schedule_id === scheduleId && Number(h4.is_working) === 1).sort((a3, b3) => a3.day_of_week - b3.day_of_week);
    if (!rows.length) return "\u2014";
    return rows.map((h4) => {
      const brk = h4.break_start && h4.break_end ? ` (${hhmm(h4.break_start)}-${hhmm(h4.break_end)})` : "";
      return `${this.dayLabel(h4.day_of_week)} ${hhmm(h4.start_time)}-${hhmm(h4.end_time)}${brk}`;
    }).join(" \xB7 ");
  }
  /** Etiqueta localizada del día (0=Lunes..6=Domingo) — ADR-0055. */
  dayLabel(day) {
    return erplora4().t(CATALOG4, DAY_KEYS[day]);
  }
  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener("erplora:locale-changed", this.onLocaleChange);
    await this.loadMembers();
    try {
      const reload = () => this.loadSchedules();
      const off1 = erplora4().on("staff.schedule.created", reload);
      const off2 = erplora4().on("staff.schedule.updated", reload);
      const off3 = erplora4().on("staff.schedule.deleted", reload);
      this.unsub = () => {
        off1();
        off2();
        off3();
      };
    } catch {
    }
  }
  disconnectedCallback() {
    window.removeEventListener("erplora:locale-changed", this.onLocaleChange);
    super.disconnectedCallback();
    this.unsub?.();
  }
  async loadMembers() {
    try {
      this.members = await erplora4().query("staff.members.list") ?? [];
      if (!this.staffId && this.members.length) {
        this.staffId = this.members[0].id;
        await this.loadSchedules();
      }
    } catch (e5) {
      this.pageError = e5 instanceof Error ? e5.message : erplora4().t(CATALOG4, "ui.errLoadMembers");
    }
  }
  async loadSchedules() {
    if (!this.staffId) {
      this.schedules = [];
      return;
    }
    this.loading = true;
    try {
      const [schedules, hours] = await Promise.all([
        erplora4().query("staff.schedules.list_for_member", { staff_id: this.staffId }),
        erplora4().query("staff.schedules.hours_for_member", { staff_id: this.staffId })
      ]);
      this.schedules = schedules ?? [];
      this.hours = hours ?? [];
    } catch (e5) {
      this.pageError = e5 instanceof Error ? e5.message : erplora4().t(CATALOG4, "ui.errLoadSchedules");
    } finally {
      this.loading = false;
    }
  }
  async onMemberChange(id) {
    this.staffId = id;
    this.pageError = "";
    await this.loadSchedules();
  }
  patchDay(day, patch) {
    this.week = this.week.map((d3) => d3.day === day ? { ...d3, ...patch } : d3);
  }
  /** Valida en cliente lo mismo que el handler WASM para dar feedback inmediato. */
  validateWeek() {
    const t5 = (k2, p4) => erplora4().t(CATALOG4, k2, p4);
    const active = this.week.filter((d3) => d3.working);
    if (!active.length) return t5("ui.valNeedWorkingDay");
    for (const d3 of active) {
      const day = this.dayLabel(d3.day);
      if (!d3.start || !d3.end) return t5("ui.valNeedStartEnd", { day });
      if (d3.start >= d3.end) return t5("ui.valStartBeforeEnd", { day });
      const hasBs = !!d3.breakStart;
      const hasBe = !!d3.breakEnd;
      if (hasBs !== hasBe) return t5("ui.valBreakBoth", { day });
      if (hasBs && !(d3.start <= d3.breakStart && d3.breakStart < d3.breakEnd && d3.breakEnd <= d3.end)) {
        return t5("ui.valBreakInside", { day });
      }
    }
    return "";
  }
  /** Row actions (staff#2): edit loads the template + ITS week into the panel; toggle flips
   *  `is_active`; delete parks the row for the confirmation alert. */
  async onRowAction(ev) {
    const row = ev.detail.row;
    this.formError = "";
    this.pageError = "";
    if (ev.detail.actionId === "edit") {
      this.editingId = row.id;
      this.newName = row.name ?? "";
      this.newDefault = Number(row.is_default) === 1;
      this.effectiveFrom = row.effective_from ?? "";
      this.effectiveUntil = row.effective_until ?? "";
      const mine = this.hours.filter((h4) => h4.schedule_id === row.id);
      this.week = DAY_KEYS.map((_k, day) => {
        const h4 = mine.find((x2) => x2.day_of_week === day && Number(x2.is_working) === 1);
        return h4 ? { day, working: true, start: hhmm(h4.start_time), end: hhmm(h4.end_time), breakStart: hhmm(h4.break_start), breakEnd: hhmm(h4.break_end) } : { day, working: false, start: "09:00", end: "18:00", breakStart: "", breakEnd: "" };
      });
      this.dataTable()?.open("edit", { title: erplora4().t(CATALOG4, "ui.panelEdit", { name: this.newName }) });
      return;
    }
    if (ev.detail.actionId === "toggle") {
      try {
        await erplora4().command("staff.schedules.set_active", { schedule_id: row.id, is_active: Number(row.is_active) ? 0 : 1 });
        await this.loadSchedules();
      } catch (e5) {
        this.pageError = domainMessage(e5, erplora4().locale, erplora4().t(CATALOG4, "ui.errUpdateSchedule"));
      }
      return;
    }
    if (ev.detail.actionId === "delete") {
      this.pendingDelete = { id: row.id, label: row.name ?? "" };
    }
  }
  async onDeleteDismiss(ev) {
    const pending = this.pendingDelete;
    this.pendingDelete = null;
    if (ev.detail?.role !== "confirm" || !pending) return;
    try {
      await erplora4().command("staff.schedules.delete", { schedule_id: pending.id });
      if (this.editingId === pending.id) this.resetForm();
      await this.loadSchedules();
    } catch (e5) {
      this.pageError = domainMessage(e5, erplora4().locale, erplora4().t(CATALOG4, "ui.errUpdateSchedule"));
    }
  }
  resetForm() {
    this.editingId = "";
    this.newName = "";
    this.newDefault = true;
    this.effectiveFrom = "";
    this.effectiveUntil = "";
    this.week = defaultWeek();
  }
  /** pm#450: the table's «Add» emits no event and keeps our form state; after an edit it would
   *  show the edited schedule under a «New» header, and the submit would UPDATE it. */
  onTableClick(e5) {
    if (!this.editingId) return;
    const addId = "staff-schedules-table-add";
    if (e5.composedPath().some((n6) => n6 instanceof HTMLElement && n6.dataset.testid === addId)) this.resetForm();
  }
  /** Wired natively, not with a Lit `@click` on the tag: `<ok-data-table>` carries `testid`, not
   *  `data-testid` (outfitkit#143), and a template binding would read as an action element that
   *  demands one. */
  firstUpdated() {
    this.renderRoot.querySelector("ok-data-table")?.addEventListener("click", (e5) => this.onTableClick(e5));
  }
  /** Header of the table panel. The title comes from open('edit', { title }) (pm#450,
   *  outfitkit#150); this `newRecord` override is the fallback for OutfitKit < 0.1.94, which
   *  ignores the title and paints `newRecord` for the edit panel too — without it, editing a
   *  schedule reads «New» and saving looks like it creates another one. */
  get panelLabels() {
    const t5 = (k2, p4) => erplora4().t(CATALOG4, k2, p4);
    return { newRecord: this.editingId ? t5("ui.panelEdit", { name: this.newName }) : t5("ui.panelNew") };
  }
  /** Referencia al panel lateral de la tabla: guardar lo cierra. */
  dataTable() {
    return this.renderRoot.querySelector("ok-data-table");
  }
  /** Create and edit share the panel: `editingId` decides the command (create ↔ update). The
   *  update REPLACES the week — the client validates the same rules the handler enforces. */
  async createSchedule(ev) {
    ev.preventDefault();
    if (!this.staffId) return;
    if (this.effectiveFrom && this.effectiveUntil && this.effectiveFrom > this.effectiveUntil) {
      this.formError = erplora4().t(CATALOG4, "ui.valRangeOrder");
      return;
    }
    const err = this.validateWeek();
    if (err) {
      this.formError = err;
      return;
    }
    this.saving = true;
    this.formError = "";
    const body = {
      name: this.newName.trim() || erplora4().t(CATALOG4, "ui.defaultScheduleName"),
      is_default: this.newDefault ? 1 : 0,
      effective_from: this.effectiveFrom || null,
      effective_until: this.effectiveUntil || null,
      working_hours: this.week.filter((d3) => d3.working).map((d3) => ({
        day_of_week: d3.day,
        start_time: d3.start,
        end_time: d3.end,
        break_start: d3.breakStart || null,
        break_end: d3.breakEnd || null,
        is_working: 1
      }))
    };
    try {
      if (this.editingId) {
        await erplora4().command("staff.schedules.update", { schedule_id: this.editingId, ...body });
      } else {
        await erplora4().command("staff.schedules.create", { staff_id: this.staffId, ...body });
      }
      this.resetForm();
      this.dataTable()?.close();
      await this.loadSchedules();
    } catch (e5) {
      this.formError = domainMessage(e5, erplora4().locale, erplora4().t(CATALOG4, this.editingId ? "ui.errUpdateSchedule" : "ui.errCreateSchedule"));
    } finally {
      this.saving = false;
    }
  }
  render() {
    const t5 = (k2) => erplora4().t(CATALOG4, k2);
    return b2`<div class="page">
        <!-- El selector de miembro NO es un campo del alta: es el ÁMBITO de la lista
             (list_for_member no lista nada sin staff_id) → por eso se queda fuera de la tabla. -->
        <header>
          <ion-select data-testid="staff-schedules-member" mode="md" fill="outline" label-placement="floating" label=${t5("ui.colMember")} .value=${this.staffId} @ionChange=${(e5) => this.onMemberChange(e5.target.value)}>${this.members.map((m4) => b2`<ion-select-option .value=${m4.id}>${m4.full_name}</ion-select-option>`)}</ion-select>
        </header>
        ${this.pageError ? b2`<ok-inline-feedback data-testid="staff-schedules-page-error" tone="danger" icon="alert-circle-outline">${this.pageError}</ok-inline-feedback>` : A}
        ${!this.members.length ? b2`<p data-testid="staff-schedules-no-members" class="hint">${t5("ui.hintNoMembers")}</p>` : A}
        <!-- The «Edit» button is not the only door: rowClickable makes the whole row open the
             same edit panel (outfitkit#67 — the actions column can be off-screen at 1440 px). -->
        <ok-data-table testid="staff-schedules-table" .fill=${true} .addable=${true} .labels=${this.panelLabels} .columns=${this.columns} .views=${true} .cardTitle=${(r6) => String(r6.name ?? "\u2014")} .cardIcon=${() => "calendar-number-outline"} .actions=${this.actions} .rowClickable=${true} .rows=${this.schedules} .searchable=${false} .emptyMessage=${this.loading ? t5("ui.loading") : t5("ui.emptySchedules")} @rowAction=${(e5) => this.onRowAction(e5)} @rowClick=${(e5) => this.onRowAction({ detail: { actionId: "edit", row: e5.detail.row } })}>
          <!-- El formulario se proyecta SIEMPRE en el panel: si solo se pintara al abrirlo, el «+»
               abriría un panel vacío (la tabla no re-renderiza a sus hijos de luz). La semana va
               DENTRO: sus días viajan en el mismo staff.schedules.create, no son otro alta. -->
          <form data-testid="staff-schedules-form" slot="create" class="form" @submit=${(e5) => this.createSchedule(e5)}>
            <ion-input data-testid="staff-schedules-name" mode="md" fill="outline" label-placement="floating" label=${t5("ui.colSchedule")} placeholder=${t5("ui.phScheduleName")} .value=${this.newName} @ionInput=${(e5) => this.newName = e5.target.value}></ion-input>
            <ion-input data-testid="staff-schedules-effective-from" mode="md" fill="outline" type="date" label=${t5("ui.labelEffectiveFrom")} label-placement="floating" .value=${this.effectiveFrom} @ionInput=${(e5) => this.effectiveFrom = e5.target.value}></ion-input>
            <ion-input data-testid="staff-schedules-effective-until" mode="md" fill="outline" type="date" label=${t5("ui.labelEffectiveUntil")} label-placement="floating" .value=${this.effectiveUntil} @ionInput=${(e5) => this.effectiveUntil = e5.target.value}></ion-input>
            <ion-checkbox data-testid="staff-schedules-default" label-placement="end" .checked=${this.newDefault} @ionChange=${(e5) => this.newDefault = e5.detail.checked}>${t5("ui.labelDefault")}</ion-checkbox>
            <div class="week">
              ${this.week.map(
      (d3) => b2`<div class="day">
                  <ion-checkbox data-testid=${`staff-schedules-day-working-${d3.day}`} justify="start" label-placement="end" .checked=${d3.working} @ionChange=${(e5) => this.patchDay(d3.day, { working: e5.detail.checked })}><span class="name">${this.dayLabel(d3.day)}</span></ion-checkbox>
                  ${d3.working ? b2`<ion-input data-testid=${`staff-schedules-day-start-${d3.day}`} mode="md" fill="outline" type="time" aria-label=${t5("ui.ariaStart")} .value=${d3.start} @ionInput=${(e5) => this.patchDay(d3.day, { start: e5.target.value })}></ion-input>
                        <span class="sep">${t5("ui.sepTo")}</span>
                        <ion-input data-testid=${`staff-schedules-day-end-${d3.day}`} mode="md" fill="outline" type="time" aria-label=${t5("ui.ariaEnd")} .value=${d3.end} @ionInput=${(e5) => this.patchDay(d3.day, { end: e5.target.value })}></ion-input>
                        <span class="sep">${t5("ui.sepBreak")}</span>
                        <ion-input data-testid=${`staff-schedules-day-break-start-${d3.day}`} mode="md" fill="outline" type="time" aria-label=${t5("ui.ariaBreakStart")} .value=${d3.breakStart} @ionInput=${(e5) => this.patchDay(d3.day, { breakStart: e5.target.value })}></ion-input>
                        <span class="sep">${t5("ui.sepTo")}</span>
                        <ion-input data-testid=${`staff-schedules-day-break-end-${d3.day}`} mode="md" fill="outline" type="time" aria-label=${t5("ui.ariaBreakEnd")} .value=${d3.breakEnd} @ionInput=${(e5) => this.patchDay(d3.day, { breakEnd: e5.target.value })}></ion-input>` : b2`<span class="sep">${t5("ui.notWorking")}</span>`}
                </div>`
    )}
            </div>
            <!-- staff#72: the refusal travels WITH the form — on a phone the panel is a full-screen sheet
                 and a banner on the page underneath it is never seen. -->
            ${this.formError ? b2`<ok-inline-feedback data-testid="staff-schedules-form-error" tone="danger" icon="alert-circle-outline">${this.formError}</ok-inline-feedback>` : A}
            <ion-button data-testid="staff-schedules-submit" type="submit" size="small" ?disabled=${this.saving || !this.staffId}>${this.saving ? t5("ui.actionSaving") : this.editingId ? t5("ui.actionSave") : t5("ui.actionCreateSchedule")}</ion-button>
          </form>
        </ok-data-table>
        <ion-alert
          data-testid="staff-schedules-delete-alert"
          .isOpen=${this.pendingDelete !== null}
          header=${t5("ui.deleteScheduleTitle")}
          message=${erplora4().t(CATALOG4, "ui.deleteScheduleMessage", { name: this.pendingDelete?.label ?? "" })}
          .buttons=${[
      { text: t5("ui.cancel"), role: "cancel", htmlAttributes: { "data-testid": "staff-schedules-delete-cancel" } },
      { text: t5("ui.actionDelete"), role: "confirm", cssClass: "alert-button-danger", htmlAttributes: { "data-testid": "staff-schedules-delete-submit" } }
    ]}
          @ionAlertDidDismiss=${(e5) => this.onDeleteDismiss(e5)}
        ></ion-alert>
      </div>`;
  }
};
__decorateClass([
  r5()
], ErpStaffSchedules.prototype, "members", 2);
__decorateClass([
  r5()
], ErpStaffSchedules.prototype, "staffId", 2);
__decorateClass([
  r5()
], ErpStaffSchedules.prototype, "schedules", 2);
__decorateClass([
  r5()
], ErpStaffSchedules.prototype, "loading", 2);
__decorateClass([
  r5()
], ErpStaffSchedules.prototype, "formError", 2);
__decorateClass([
  r5()
], ErpStaffSchedules.prototype, "pageError", 2);
__decorateClass([
  r5()
], ErpStaffSchedules.prototype, "saving", 2);
__decorateClass([
  r5()
], ErpStaffSchedules.prototype, "newName", 2);
__decorateClass([
  r5()
], ErpStaffSchedules.prototype, "newDefault", 2);
__decorateClass([
  r5()
], ErpStaffSchedules.prototype, "effectiveFrom", 2);
__decorateClass([
  r5()
], ErpStaffSchedules.prototype, "effectiveUntil", 2);
__decorateClass([
  r5()
], ErpStaffSchedules.prototype, "week", 2);
__decorateClass([
  r5()
], ErpStaffSchedules.prototype, "hours", 2);
__decorateClass([
  r5()
], ErpStaffSchedules.prototype, "editingId", 2);
__decorateClass([
  r5()
], ErpStaffSchedules.prototype, "pendingDelete", 2);
define("erp-staff-schedules", ErpStaffSchedules);

// ui/components/erp-staff-time-off/erp-staff-time-off.ts
var CATALOG5 = { es: es_default, en: en_default };
var EMPTY_DRAFT = {
  staff_id: "",
  leave_type: "vacation",
  start_date: "",
  end_date: "",
  is_full_day: true,
  start_time: "",
  end_time: "",
  reason: ""
};
function erplora5() {
  const c5 = globalThis.erplora;
  if (!c5) throw new Error("erplora SDK no inicializado por el shell");
  return c5;
}
var ErpStaffTimeOff = class extends i3 {
  constructor() {
    super(...arguments);
    this.formError = "";
    this.pageError = "";
    this.busyId = "";
    this.tick = 0;
    this.members = [];
    this.draft = { ...EMPTY_DRAFT };
    this.saving = false;
    this.onLocaleChange = () => this.requestUpdate();
  }
  static {
    this.styles = i`
    :host { display:block; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    header { display:flex; gap:.5rem; align-items:center; margin-bottom:.75rem; }
    h2 { margin:0; font-size:1.15rem; flex:1; }
    /* El alta vive en el panel lateral de la tabla: columna estrecha, no fila que se desborda. */
    .form { display:flex; flex-direction:column; gap:.7rem; }
    .form ion-button { align-self:flex-end; }
    /* Two columns when the panel is wide enough (tablet/desktop), one on a phone. */
    .grid2 { display:grid; grid-template-columns:repeat(auto-fit, minmax(11rem, 1fr)); gap:.6rem; align-items:center; }
    .err { color:#d9480f; font-weight:600; }
  `;
  }
  /** Show/hide only: the runtime revalidates `staff.manage_time_off` on the command itself. */
  get canManage() {
    return erplora5().hasPermission?.("staff.manage_time_off") === true;
  }
  get columns() {
    const t5 = (k2) => erplora5().t(CATALOG5, k2);
    return [
      { key: "staff_name", header: t5("ui.colMember"), sortable: true, filterable: true, filterType: "text" },
      // El valor CRUDO (`vacation`, `pending`, `2026-09-10`) no se enseña: la celda lee del mismo
      // catálogo que el desplegable del alta y que las opciones del filtro (staff#37).
      {
        key: "leave_type",
        header: t5("ui.colType"),
        sortable: true,
        filterable: true,
        filterType: "select",
        options: enumOptions(LEAVE_TYPE_KEY),
        format: (r6) => enumLabel(LEAVE_TYPE_KEY, r6.leave_type)
      },
      { key: "start_date", header: t5("ui.colFrom"), sortable: true, filterable: true, filterType: "daterange", format: (r6) => formatDate(r6.start_date) },
      { key: "end_date", header: t5("ui.colTo"), sortable: true, filterable: true, filterType: "daterange", format: (r6) => formatDate(r6.end_date) },
      {
        key: "status",
        header: t5("ui.colStatus"),
        sortable: true,
        filterable: true,
        filterType: "select",
        options: enumOptions(REQUEST_STATUS_KEY),
        format: (r6) => enumLabel(REQUEST_STATUS_KEY, r6.status)
      }
    ];
  }
  get actions() {
    const t5 = (k2) => erplora5().t(CATALOG5, k2);
    return [
      // Solo icono (ADR-0133): el `label` viaja como title + aria-label del botón, no como texto.
      { id: "approve", label: t5("ui.actionApprove"), icon: "checkmark-circle-outline", color: "primary" },
      { id: "reject", label: t5("ui.actionReject"), icon: "close-circle-outline", color: "medium" }
    ];
  }
  // TODO-LIT: componentWillLoad → connectedCallback. Recuerda: connectedCallback se dispara
  // en CADA reconexión al DOM (no solo en el primer montaje). Si la init debe correr una
  // sola vez tras el primer render, considera firstUpdated() en su lugar.
  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener("erplora:locale-changed", this.onLocaleChange);
    this.ctrl = createListController(erplora5(), "staff.time_off.list", () => this.requestUpdate(), {
      pageSize: 50,
      sort: "id",
      dir: "asc"
    });
    await Promise.all([this.ctrl.load(), this.loadMembers()]);
    try {
      const off1 = erplora5().on("staff.time_off.created", () => this.ctrl.load());
      const off2 = erplora5().on("staff.time_off.status_changed", () => this.ctrl.load());
      this.unsub = () => {
        off1();
        off2();
      };
    } catch {
    }
  }
  disconnectedCallback() {
    window.removeEventListener("erplora:locale-changed", this.onLocaleChange);
    super.disconnectedCallback();
    this.unsub?.();
  }
  /** Los miembros del hub para el selector del alta. Si no se pueden leer, el panel se queda sin
   *  opciones — pero la pantalla sigue aprobando y rechazando, que es lo que ya hacía. */
  async loadMembers() {
    try {
      this.members = await erplora5().query("staff.members.list") ?? [];
    } catch {
    }
  }
  dataTable() {
    return this.renderRoot.querySelector("ok-data-table");
  }
  patch(p4) {
    this.draft = { ...this.draft, ...p4 };
  }
  /**
   * Lo que el usuario puede corregir se le dice AQUÍ, antes de gastar un viaje al servidor y de
   * leer un error crudo del handler. Lo que solo sabe el servidor —el solape con otra ausencia
   * `pending|approved`— no se adivina: se manda y se pinta su código de dominio traducido.
   *
   * Devuelve la clave i18n del primer problema, o `''` si el borrador es enviable.
   */
  validationKey() {
    const d3 = this.draft;
    if (!d3.staff_id) return "ui.valTimeOffMember";
    if (!d3.start_date || !d3.end_date) return "ui.valTimeOffDates";
    if (d3.start_date > d3.end_date) return "ui.valTimeOffRange";
    if (!d3.is_full_day) {
      if (!d3.start_time || !d3.end_time) return "ui.valTimeOffHours";
      if (d3.start_time >= d3.end_time) return "ui.valTimeOffHoursOrder";
    }
    return "";
  }
  /** Alta de una ausencia (staff#36): la puerta que le faltaba a `staff.time_off.create`. */
  async createTimeOff(ev) {
    ev.preventDefault?.();
    const problem = this.validationKey();
    if (problem) {
      this.formError = erplora5().t(CATALOG5, problem);
      return;
    }
    const d3 = this.draft;
    this.saving = true;
    this.formError = "";
    try {
      await erplora5().command("staff.time_off.create", {
        staff_id: d3.staff_id,
        leave_type: d3.leave_type || "vacation",
        start_date: d3.start_date,
        end_date: d3.end_date,
        is_full_day: d3.is_full_day ? 1 : 0,
        start_time: d3.is_full_day ? null : d3.start_time,
        end_time: d3.is_full_day ? null : d3.end_time,
        reason: d3.reason
      });
      this.draft = { ...EMPTY_DRAFT };
      this.dataTable()?.close();
      await this.ctrl.load();
    } catch (e5) {
      this.formError = domainMessage(e5, erplora5().locale, erplora5().t(CATALOG5, "ui.errCreateTimeOff"));
    } finally {
      this.saving = false;
    }
  }
  async onRowAction(actionId, row) {
    if (row.status !== "pending") return;
    const status = actionId === "approve" ? "approved" : "rejected";
    const id = row.id;
    this.busyId = id;
    this.pageError = "";
    try {
      await erplora5().command("staff.time_off.set_status", { time_off_id: id, status });
      await this.ctrl.load();
    } catch (e5) {
      this.pageError = domainMessage(e5, erplora5().locale, erplora5().t(CATALOG5, "ui.errSetStatus"));
    } finally {
      this.busyId = "";
    }
  }
  render() {
    const t5 = (k2) => erplora5().t(CATALOG5, k2);
    return b2`<div>
        <header>
          <h2>${t5("ui.timeOffTitle")}</h2>
        </header>
        ${this.pageError ? b2`<ok-inline-feedback data-testid="staff-time-off-page-error" tone="danger" icon="alert-circle-outline">${this.pageError}</ok-inline-feedback>` : A}
        ${this.ctrl?.error ? b2`<ok-inline-feedback data-testid="staff-time-off-load-error" tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : A}
        <ok-data-table testid="staff-time-off-table" .serverSide=${true} .addable=${this.canManage} .columns=${this.columns} .views=${true} .cardTitle=${(r6) => String(r6.staff_name ?? "\u2014")} .cardIcon=${() => "airplane-outline"} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? "asc"} .searchable=${true} .actions=${this.actions} .searchPlaceholder=${t5("ui.searchMember")} .emptyMessage=${this.ctrl?.loading ? t5("ui.loading") : t5("ui.emptyTimeOff")} @rowAction=${(e5) => this.onRowAction(e5.detail.actionId, e5.detail.row)} @pageChange=${(e5) => this.ctrl.setPage(e5.detail)} @sortChange=${(e5) => this.ctrl.setSort(e5.detail.sort, e5.detail.dir)} @searchChange=${(e5) => this.ctrl.setSearch(e5.detail)} @filterChange=${(e5) => this.ctrl.setFilter(e5.detail.col, e5.detail.value)}>
          <!-- El alta se proyecta SIEMPRE en el panel: si solo se pintara al abrirlo, el «+»
               abriría un panel vacío (la tabla no re-renderiza a sus hijos de luz). -->
          ${this.renderCreateForm()}
        </ok-data-table>
      </div>`;
  }
  /** El alta (staff#36): «Miembro · Tipo · Desde · Hasta · Día completo · (horas) · Motivo», que es
   *  lo que ofrecen Fresha, Vagaro, Mangomint, Square Team, Odoo Empleados y BC. `mode="md"` en cada
   *  control con `fill`: el shell pinea Ionic en `ios` y ahí `fill` no pinta caja (staff#39/hub#760). */
  renderCreateForm() {
    const t5 = (k2) => erplora5().t(CATALOG5, k2);
    return b2`<form data-testid="staff-time-off-form" slot="create" class="form" @submit=${(e5) => this.createTimeOff(e5)}>
      <ion-select data-testid="staff-time-off-member" data-field="staff_id" mode="md" fill="outline" label-placement="floating" label=${t5("ui.colMember")} .value=${this.draft.staff_id} @ionChange=${(e5) => this.patch({ staff_id: e5.target.value ?? "" })}>
        ${this.members.map((m4) => b2`<ion-select-option .value=${m4.id}>${m4.full_name}</ion-select-option>`)}
      </ion-select>
      <ion-select data-testid="staff-time-off-leave-type" data-field="leave_type" mode="md" fill="outline" label-placement="floating" label=${t5("ui.colType")} .value=${this.draft.leave_type} @ionChange=${(e5) => this.patch({ leave_type: e5.target.value ?? "vacation" })}>
        ${enumOptions(LEAVE_TYPE_KEY).map((o7) => b2`<ion-select-option .value=${o7.value}>${o7.label}</ion-select-option>`)}
      </ion-select>
      <div class="grid2">
        <ion-input data-testid="staff-time-off-start-date" data-field="start_date" mode="md" fill="outline" label-placement="floating" type="date" label=${t5("ui.colFrom")} .value=${this.draft.start_date} @ionInput=${(e5) => this.patch({ start_date: e5.target.value })}></ion-input>
        <ion-input data-testid="staff-time-off-end-date" data-field="end_date" mode="md" fill="outline" label-placement="floating" type="date" label=${t5("ui.colTo")} .value=${this.draft.end_date} @ionInput=${(e5) => this.patch({ end_date: e5.target.value })}></ion-input>
      </div>
      <ion-toggle data-testid="staff-time-off-full-day" data-field="is_full_day" label-placement="end" .checked=${this.draft.is_full_day} @ionChange=${(e5) => this.patch({ is_full_day: !!e5.detail.checked })}>${t5("ui.fullDay")}</ion-toggle>
      ${this.draft.is_full_day ? A : b2`<div class="grid2" data-section="hours">
            <ion-input data-testid="staff-time-off-start-time" data-field="start_time" mode="md" fill="outline" label-placement="floating" type="time" label=${t5("ui.timeFrom")} .value=${this.draft.start_time} @ionInput=${(e5) => this.patch({ start_time: e5.target.value })}></ion-input>
            <ion-input data-testid="staff-time-off-end-time" data-field="end_time" mode="md" fill="outline" label-placement="floating" type="time" label=${t5("ui.timeTo")} .value=${this.draft.end_time} @ionInput=${(e5) => this.patch({ end_time: e5.target.value })}></ion-input>
          </div>`}
      <ion-textarea data-testid="staff-time-off-reason" data-field="reason" mode="md" fill="outline" label-placement="floating" auto-grow label=${t5("ui.reason")} .value=${this.draft.reason} @ionInput=${(e5) => this.patch({ reason: e5.target.value })}></ion-textarea>
      <!-- staff#72: the refusal travels WITH the form — on a phone the panel is a full-screen sheet
           and a banner on the page underneath it is never seen. -->
      ${this.formError ? b2`<ok-inline-feedback data-testid="staff-time-off-form-error" tone="danger" icon="alert-circle-outline">${this.formError}</ok-inline-feedback>` : A}
      <ion-button data-testid="staff-time-off-submit" type="submit" size="small" ?disabled=${this.saving}>${this.saving ? t5("ui.actionSaving") : t5("ui.actionAdd")}</ion-button>
    </form>`;
  }
};
__decorateClass([
  r5()
], ErpStaffTimeOff.prototype, "formError", 2);
__decorateClass([
  r5()
], ErpStaffTimeOff.prototype, "pageError", 2);
__decorateClass([
  r5()
], ErpStaffTimeOff.prototype, "busyId", 2);
__decorateClass([
  r5()
], ErpStaffTimeOff.prototype, "tick", 2);
__decorateClass([
  r5()
], ErpStaffTimeOff.prototype, "members", 2);
__decorateClass([
  r5()
], ErpStaffTimeOff.prototype, "draft", 2);
__decorateClass([
  r5()
], ErpStaffTimeOff.prototype, "saving", 2);
define("erp-staff-time-off", ErpStaffTimeOff);
