const React = require('react');

const NextImage = ({ src, alt, ...props }) => React.createElement('img', {
  src,
  alt,
  ...props,
});

module.exports = NextImage;
module.exports.default = NextImage;
