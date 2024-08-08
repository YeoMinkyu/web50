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
  document.querySelector('#read-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';
}

function load_mailbox(mailbox) {
  
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#read-view').style.display = 'none';
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
        inbox_row.classList.add('inbox-row');
        inbox_row.id = email.id;

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

        inbox_row.addEventListener('click', function() {
          view_email(this.id);
        });

        inbox_container.append(inbox_row);
      });

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

function view_email(email_id) {

  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#read-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';


  // alert(email.subject);
  fetch(`/emails/${email_id}`)
  .then(response => response.json())
  .then(email => {
    // Print email
    console.log(email);

    // ... do something else with email ...
    document.querySelector('#read-view').innerHTML = `
    <div id='email-info'></div>
    <hr>
    <div id='email-body'></div>
    `;
    let email_info = document.querySelector('#email-info');
    let email_body = document.querySelector('#email-body');

    let email_sender = document.createElement('p');
    let email_recipients = document.createElement('p');
    let email_subject = document.createElement('p');
    let email_timestamp = document.createElement('p');
    let email_contents = document.createElement('p');
    let reply_button = document.createElement('button');

    email_sender.innerHTML = `<b>From: </b>${email.sender}`;
    email_recipients.innerHTML = `<b>To: </b>${email.recipients}`;
    email_subject.innerHTML = `<b>Subject: </b>${email.subject}`;
    email_timestamp.innerHTML = `<b>Timestamp: </b>${email.timestamp}`;
    reply_button.innerHTML = 'Reply';
    reply_button.type = 'button';
    reply_button.classList.add('btn', 'btn-outline-primary');

    email_contents.innerHTML = email.body;

    email_info.append(email_sender, email_recipients, email_subject, email_timestamp, reply_button);
    email_body.append(email_contents);
  });

  fetch(`/emails/${email_id}`, {
    method: 'PUT',
    body: JSON.stringify({
      read: true
    })
  })
}