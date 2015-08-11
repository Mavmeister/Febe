var React = require('react');
var Oauth = require('./signupOAuth');
var Org = require('./signupOrg');
var Header = require('./header');
var Footer = require('./footer');

module.exports = React.createClass({
	render: function() {
		return (
			<div>
        <Header link='/' title='Home'/>
	      <Oauth name="Organization" />
	      <Org />
        <Footer />
			</div>
		)
	}
})