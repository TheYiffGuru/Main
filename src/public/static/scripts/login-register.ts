const emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;

function checkLen(e: HTMLInputElement) {
	if ((e.minLength > 0 && e.value.length < e.minLength) || (e.maxLength > 0 && e.value.length > e.maxLength)) e.classList.add("invalid");
	else e.classList.remove("invalid");
}

function login(e: HTMLFormElement) {
	const v = e.querySelector<HTMLInputElement>("input[name=identifier]").value;
	fetch("/api/login", {
		method: "POST",
		body: JSON.stringify({
			...(emailRegex.test(v) ?
				{
					email: v
				} : {
					handle: v
				}
			),
			password: e.querySelector<HTMLInputElement>("input[name=password]").value
		}),
		headers: {
			"Content-Type": "application/json",
			"Accept": "applicatoon/json"
		},
		credentials: "same-origin"
	})
		.then(res => res.json())
		.then(res => {
			if (!res.success) alert(JSON.stringify(res));
			else window.location.href = "/dashboard";
		});
}

function register(e: HTMLFormElement) {
	fetch("/api/register", {
		method: "POST",
		body: JSON.stringify({
			handle: e.querySelector<HTMLInputElement>("input[name=handle]").value,
			email: e.querySelector<HTMLInputElement>("input[name=email]").value,
			password: e.querySelector<HTMLInputElement>("input[name=password]").value
		}),
		headers: {
			"Content-Type": "application/json",
			"Accept": "application/json"
		},
		credentials: "same-origin"
	})
		.then(res => res.json())
		.then(res => {
			if (!res.success) alert(JSON.stringify(res));
			else window.location.href = "/dashboard";
		});
}
