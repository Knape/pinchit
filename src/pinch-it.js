// @flow
//
import eventDispatcher from './utils/dispatch-event';
import { detectDoubleTap } from './utils/detect-event';
import { cancelEvent, getTouches } from './utils/handle-event';
import { scaleElement, scaleEl, translateEl } from './utils/handle-element';
import { isWithin, calcScale, calcNewScale, getInitialScale, scaleFactor, getTouchCenter } from './utils/handle-pinch';
import { drag } from './utils/handle-drag';
import defaults from './defaults';

const first = (items: Array<Object>) => items[0];

const pinchIt = (targets: string | Object, options: Object = {}) => {
  // private variable cache
  let elements;

  let scaling;
  let lastScale = 1;
  let firstTouch;
  let lastTouch;

  let zoomFactor = 1;

  let offset = { x: 0, y: 0 };
  let lastDragPosition;
  let lastZoomCenter = false

  const { on, dispatch } = eventDispatcher();

 /**
  *  dispatchPinchEvent - Shorthand method for creating events
  *
  *  @param { String } phase
  *  @param { String } type
  *  @param { Object } details
  *  @return { Void }
  **/
  const dispatchPinchEvent = (eventName: string, phase: string, data: Object = {}): void => {
    dispatch(eventName, Object.assign(data, {
      phase
    }));
  };

  const resetGlobals = (/* opts */): void => {
    scaling = false;
    lastScale = 1;
    firstTouch = null;
    lastTouch = null;
    zoomFactor = 1;
  };

  // event handling
  /**
   * Set scaling if we are using more then one finger
   * and captures our first punch point
   *
   * private
   * @param { Object } e the event from our eventlistener
   */
  const onTouchstart = (opts: Object) => (e: TouchEvent) => {
    dispatchPinchEvent('touchstart', 'before', e);

    scaling = (e.touches.length === 2);
    firstTouch = Array.from(e.touches);

    if (detectDoubleTap(e)) {
      scaleEl(e.target, 1, opts.snapBackSpeed, opts.ease);
      resetGlobals();
    }

    dispatchPinchEvent('touchstart', 'after', e);
  };

  const onTouchmove = (opts: Object) => (e: TouchEvent) => {
    dispatchPinchEvent('touchmove', 'before', e);

    if ((!scaling || !firstTouch) /* && getInitialScale(e.target) > 1 */) {
      cancelEvent(e);
      const touch = first(getTouches(Array.from(e.touches)));
      offset = drag(touch, lastDragPosition, offset);
      lastDragPosition = touch;
      console.log(zoomFactor);
      translateEl(e.target, offset, zoomFactor);
    } else if (scaling && firstTouch) {
      cancelEvent(e);

      const touchCenter = getTouchCenter(Array.from(e.touches));
      const newScale = calcScale(firstTouch, Array.from(e.touches));
      let scale = newScale / lastScale;
      console.log('scale', scale);
      console.log('zoomFactor', zoomFactor);
      const factor = scaleFactor(scale, zoomFactor, opts);
      console.log(factor);
      zoomFactor = factor.zoomFactor;
      scale = factor.scale;
      lastScale = newScale;
      lastZoomCenter = touchCenter;

      offset = drag(first(Array.from(e.touches)), lastDragPosition, offset);
    }

    scaleElement(e.target, zoomFactor, offset, 0, opts.ease);

    dispatchPinchEvent('touchmove', 'after', e);
  };

  const onTouchend = opts => (e: TouchEvent) => {
    dispatchPinchEvent('touchend', 'before', e);

    if (firstTouch && lastTouch) {
      // const scale = calcNewScale(calcScale(firstTouch, lastTouch), lastScale);
      //
      // resetGlobals();


      // lastScale = getInitialScale(e.target);
      //
      // if (!isWithin(getInitialScale(e.target) * zoomFactor, opts)) {
      //   const isLessThan = (getInitialScale(e.target) * zoomFactor < opts.minScale);
      //   lastScale = isLessThan ? opts.minScale : opts.maxScale;
      //   scaleEl(e.target, lastScale, opts.snapBackSpeed, opts.ease);
      // }
    }

    dispatchPinchEvent('touchend', 'after', e);
  };

  const attachEvents = opts => (el: HTMLElement) => {
    el.addEventListener('touchstart', onTouchstart(opts));
    el.addEventListener('touchmove', onTouchmove(opts));
    el.addEventListener('touchend', onTouchend(opts));
  };

  const detachhEvents = (el: Object) => {
    el.removeEventListener('touchstart', onTouchstart);
    el.removeEventListener('touchmove', onTouchmove);
    el.removeEventListener('touchend', onTouchend);
  };

  /**
   * public
   * reset function:
   * @param { Number } duration
   * @param { String } easing
   * @return { Void }
   */
  const reset = (opt: Object) => (item: ?number): void => {
    const { snapBackSpeed, easing } = {...defaults, ...opt};

    if (item && !isNaN(item) && elements[item]) {
      scaleEl(elements[item], 1, snapBackSpeed, easing);
    } else {
      Array.from(elements).forEach(el => scaleEl(el, 1, snapBackSpeed, easing));
    }

    resetGlobals();
  };

  /**
   * public
   * destroy function: called to gracefully destroy the lory instance
   * @return { Void }
   */
  const destroy = (): void => {
    dispatchPinchEvent('destroy', 'before', {});
    // remove event listeners
    Array.from(elements).forEach(detachhEvents);
    dispatchPinchEvent('destroy', 'after', {});
  };

  /**
   * setup - Init function
   *
   * @param { String, Object }
   * @return { Void }
   **/

  type Options = {
    maxPinch?: number;
    minPinch?: number;
    snapBackSpeed?: number;
    ease?: string;
  };

  const setup = (target: string | Object, opt: Options): void => {
    if (elements) destroy();
    dispatchPinchEvent('init', 'before', {});

    // Base configuration for the pinch instance
    const opts = {...defaults, ...opt};

    // resolve target
    // pinchit allows for both a node or a string to be passed
    switch (typeof target) {
      case 'object':
        elements = Array.isArray(target) ? target : [target];
        break;
      case 'string':
        elements = document.querySelectorAll(target);
        break;
      default:
        elements = [];
        console.warn('missing target, either pass an node or a string');
    }

    Array.from(elements).forEach(attachEvents(opts));

    dispatchPinchEvent('init', 'after', {});
  };

  // trigger initial setup
  setup(targets, options);

  return {
    setup,
    reset: reset(options),
    destroy,
    elements,
    on,
  };
};

export default pinchIt;
