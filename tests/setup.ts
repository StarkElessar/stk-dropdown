/**
 * Setup для vitest + jsdom
 * Полифиллы для API, не реализованных в jsdom
 */

// scrollIntoView не реализован в jsdom
Element.prototype.scrollIntoView = function () {};

