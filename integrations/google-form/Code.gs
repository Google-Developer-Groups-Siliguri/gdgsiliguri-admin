function onFormSubmit(e) {
  const v = e.namedValues;
  const props = PropertiesService.getScriptProperties();
  const payload = {
    title: first(v['Project name']),
    summary: first(v['Short description']),
    body: first(v['Longer write-up']),
    email: first(v['Email address']),
    team: splitNames(first(v['Team members'])),
    repo: first(v['Repository link']),
    demo: first(v['Live demo link']),
    video: first(v['Video link']),
    tags: splitList(first(v['Tech used'])),
    imageLinks: splitList(first(v['Screenshots'])),
    edition: Number(props.getProperty('EDITION')),
    consent: /yes|agree/i.test(first(v['Consent to publish']) || ''),
  };
  UrlFetchApp.fetch(props.getProperty('INGEST_URL'), {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: { 'X-Ingest-Secret': props.getProperty('INGEST_SECRET') },
    payload: JSON.stringify(payload),
  });
}

const first = (a) => (a && a[0] ? String(a[0]).trim() : undefined);
const splitList = (s) => (s ? s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean) : []);
const splitNames = (s) => splitList(s).map((name) => ({ name }));
