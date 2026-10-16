// MSW's React Native fetch interceptor evaluates TransformStream at import time.
// Install the Web Streams globals before evaluating App or any of its imports.
import './src/polyfills';
import { registerRootComponent } from 'expo';
import App from './src/App';

registerRootComponent(App);
