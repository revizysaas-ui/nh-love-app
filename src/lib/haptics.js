export function vibrate(ms = 20) {
  if (typeof navigator !== 'undefined' && navigator.vibrate && localStorage.getItem('nh_haptic') !== 'false') {
    navigator.vibrate(ms)
  }
}
