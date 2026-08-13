/* Coordinate helpers shared by everything that paints on the chart.
 *
 * Chart-free and DOM-free: the time scale is handed in, so the modules that
 * use this stay importable by the dev-time Node harnesses.
 */

/* timeToCoordinate returns null outside the visible range; a partially visible
 * shape still needs its off-screen edge, so clamp it to the pane side the time
 * falls beyond. */
export function xCoordinate(time, timeScale, visible, width) {
  const coordinate = timeScale.timeToCoordinate(time);
  if (coordinate !== null) return coordinate;
  if (time <= visible.from) return 0;
  if (time >= visible.to) return width;
  return null;
}
