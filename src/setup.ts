import "source-map-support/register";
import SuppressWarnings from "suppress-warnings";
SuppressWarnings([
	(w) => w.toString().indexOf("MongoError") !== -1
]);
import "./util/email/Mailer";
import "./index";
