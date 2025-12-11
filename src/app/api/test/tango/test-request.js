const options = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    authorization: 'Basic UUFQbGF0Zm9ybTI6YXBZUGZUNkhOT05wRFJVajNDTEdXWXQ3Z3ZJSE9OcERSVVlQZlQ2SGo='
  }
};

fetch('https://integration-api.tangocard.com/raas/v2/catalogs?verbose=true', options)
  .then(res => res.json())
  .then(res => console.log(res))
  .catch(err => console.error(err));