// Keep this module free of application imports. index.js must evaluate it
// before importing App because MSW inspects Web Streams during module loading.
import 'web-streams-polyfill';
