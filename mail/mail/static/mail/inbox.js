document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);

  // Use submit button to send an email
  document.querySelector('#compose-form').onsubmit = send_email;
  
  // By default, load the inbox
  load_mailbox('inbox');
});

function compose_email() {
  // alert("Debug : compose_email");
  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';
}

function load_mailbox(mailbox) {
  
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `
    <h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>
    <div id='inbox-container'></div>
  `;

  fetch(`/emails/${mailbox}`)
  .then(response => response.json())
  .then(emails => {
      // Print emails
      console.log(emails);

      let inbox_container = document.querySelector('#inbox-container');

      emails.forEach(email => {
        let inbox_row = document.createElement('div');
        inbox_row.id = 'inbox-row';

        let sender_element = document.createElement('div');
        let subject_element = document.createElement('div');
        let timestamp_element = document.createElement('div');

        sender_element.className = 'col sender';
        subject_element.className = 'col subject';
        timestamp_element.className = 'col timestamp';

        sender_element.innerHTML = email.sender;
        subject_element.innerHTML = email.subject;
        timestamp_element.innerHTML = email.timestamp;

        inbox_row.append(sender_element, subject_element, timestamp_element);

        if (email.read === true ) {
          inbox_row.style.backgroundColor = 'gray';
        } else {
          inbox_row.style.backgroundColor = 'white';
        }

        inbox_container.append(inbox_row);
      }); 

      // element.addEventListener('click', function() {
      //     console.log('This element has been clicked!')
      // });

  })
}

function send_email() {
  const recipients = document.querySelector('#compose-recipients').value;
  const subject = document.querySelector('#compose-subject').value;
  const body = document.querySelector('#compose-body').value;

  fetch('/emails', {
    method: 'POST',
    headers: {
      'Content-Type':'application/json;charset=utf-8'
    },
    body: JSON.stringify({
        recipients: recipients,
        subject: subject,
        body: body
    })
  })
  .then(response => response.json())
  .then(result => {
      // Print result
      if(result.message) {
        load_mailbox('sent');
      } else {
        alert(result.error);
      }
      console.log(result);
  });

  return false;
}