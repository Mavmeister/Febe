var React = require('react');
var Link = require('react-router').Link


module.exports = React.createClass({
  getInitialState: function() {
    return {
      description: ''
    };
  },

  updateBio: function(event) {
    this.props.updateDescription(event.target.value);
  },
  
  render: function() {
    return (
      <div>
        <p>descriptiondescriptiondescription description description description description description description description description description description description description description description description description description description description description description description description description description description description description description description description description description description description description description description 
        </p>
      </div>
    )
  }
});