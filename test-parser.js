const parse = require('html-react-parser').default || require('html-react-parser');
const React = require('react');
const ReactDOMServer = require('react-dom/server');

try {
  const el = parse('<form @submit.prevent="foo" :class="bar"></form>');
  console.log(ReactDOMServer.renderToString(el));
} catch(e) {
  console.log('ERROR:', e.message);
}