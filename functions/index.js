const admin = require('firebase-admin');
const functions = require('firebase-functions');
const dateFns = require('date-fns')
const { utcToZonedTime } = require('date-fns-tz');
const cors = require("cors")({
  origin: true
});
const SENDGRID_API_KEY = functions.config().sendgrid.key;
const sgMail = require('@sendgrid/mail')
admin.initializeApp();
sgMail.setApiKey(SENDGRID_API_KEY)

const firestoreDatabase = admin.firestore().collection('tenant')
const { addDays, addMonths, addQuarters, addWeeks, addYears, format, parse, isWithinInterval } = dateFns
const timeZone = 'Africa/Nairobi'

// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions

const APP_NAME = "RentGate PM"
const SINGLE_UNIT_MANAGEMENT_CHARGE = 100
const COMPANY_DETAILS_CONFIG = {
  company_name: APP_NAME,
  company_address: "43 - 01020 Kenol, Murang'a",
  company_phone_number: "0742654637",
  company_primary_email: "rentgatepmltd@gmail.com",

}

const zonedDate = utcToZonedTime(new Date().toISOString(), timeZone)
const zonedDateString = format(zonedDate, 'yyyy-MM-dd')

const TEMPLATES_PLACEHOLDER = "<h4>Customise template to your own needs. </h4>"

const EMAIL_TEMPLATES = [
  { template_name: "Welcome Letter", template_contents: TEMPLATES_PLACEHOLDER, last_edit: zonedDate },
  { template_name: "Move Out Notice", template_contents: TEMPLATES_PLACEHOLDER, last_edit: zonedDate },
  { template_name: "Move In Letter", template_contents: TEMPLATES_PLACEHOLDER, last_edit: zonedDate },
  { template_name: "Notice of Change of Rent", template_contents: TEMPLATES_PLACEHOLDER, last_edit: zonedDate },
  { template_name: "Notice to Pay or Quit", template_contents: TEMPLATES_PLACEHOLDER, last_edit: zonedDate },
]



exports.genericEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth && !context.auth.token.email) {
    throw new functions.https.HttpsError('failed-precondition', 'Must be logged with an email address');
  }

  const msg = {
    to: context.auth.token.email,
    from: 'RentGatePM',
    // templateId: TEMPLATE_ID,
    dynamic_template_data: {
      subject: data.subject,
      name: data.text,
    },
  };

  await sgMail.send(msg);

  // Handle errors here

  // Response must be JSON serializable
  return { success: true };
})


const sendCustomEmail = (mailOptions) => {
  //send email here
  sgMail
    .send(mailOptions)
    .then(() => {
      return { success: true }
    })
    .catch((error) => {
      console.error(error)
      throw new functions.https.HttpsError(`email-sending-failed',
       'Sending email failed with error message => ${error}.`);
    })

}


const sendInvoice = (companyProfile, tenantDetails, items) => {
  const text = `
    <!doctype html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Invoice</title>
        <style>
        .invoice-box {
            max-width: 800px;
            margin: auto;
            padding: 30px;
            font-size: 16px;
            line-height: 24px;
            font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif;
            color: #555;
        }
        .invoice-box table {
            width: 100%;
            line-height: inherit;
            text-align: left;
        }
        .invoice-box table td {
            padding: 5px;
            vertical-align: top;
        }
        .invoice-box table tr td:nth-child(2), .invoice-box table tr td:nth-child(3) {
            text-align: right;
        }            
        .invoice-box table tr.top table td {
            padding-bottom: 20px;
        }
        .invoice-box table tr.top table td.title {
            font-size: 45px;
            line-height: 45px;
            color: #333;
        }
        .invoice-box table tr.information table td {
            padding-bottom: 40px;
        }
        .invoice-box table tr.heading td {
            background: #eee;
            border-bottom: 1px solid #ddd;
            font-weight: bold;
        }
        .invoice-box table tr.details td {
            padding-bottom: 20px;
        }
        .invoice-box table tr.item td{
            border-bottom: 1px solid #eee;
        }
        .invoice-box table tr.item.last td {
            border-bottom: none;
        }
        .invoice-box table tr.total td:nth-child(3) {
            border-top: 2px solid #eee;
            font-weight: bold;
        }
        @media only screen and (max-width: 600px) {
            .invoice-box table tr.top table td {
                width: 100%;
                display: block;
                text-align: center;
            }
            .invoice-box table tr.information table td {
                width: 100%;
                display: block;
                text-align: center;
            }
        }
        /** RTL **/
        .rtl {
            direction: rtl;
            font-family: Tahoma, 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif;
        }
        .rtl table {
            text-align: right;
        }
        .rtl table tr td:nth-child(2) {
            text-align: left;
        }
        </style>
    </head>
    <body onafterprint="self.close()">
        <div class="invoice-box">
            <table cellpadding="0" cellspacing="0">
                <tr class="top">
                    <td colspan="3">
                        <table>
                            <tr>
                                <td class="title">
                                </td>
                                <td>
                                    Invoice #: ${zonedDate.toISOString().slice(0, 10)}-${tenantDetails.id_number}<br>
                                    Created: ${zonedDateString}<br>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr class="information">
                    <td colspan="3">
                        <table>
                            <tr>
                                <td>
                                    ${companyProfile.company_name}<br>
                                    ${companyProfile.company_address}<br>
                                    ${companyProfile.company_phone_number}<br>
                                    ${companyProfile.company_primary_email}
                                </td>
                                
                                <td>
                                    Name: ${tenantDetails.first_name} ${tenantDetails.last_name}<br>
                                    Id Number: ${tenantDetails.id_number}<br>
                                    Phone Number: ${tenantDetails.personal_phone_number}<br>
                                    Email: ${tenantDetails.contact_email}
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr class="heading">
                    <td>
                        Item
                    </td>
                    <td>
                        Due Date
                    </td>
                    <td>
                        Amount
                    </td>
                </tr>
                ${Array.from(items).map(item =>
    `<tr class="item">
        <td>
          ${item.charge_label}
        </td>
        <td>
          ${item.due_date}
        </td>
        <td>
          Ksh ${item.charge_amount}
        </td>
      </tr>`
  )}
                <tr class="total">
                    <td></td>
                    <td></td>
                    <td>
                       Total: Ksh: ${Array.from(items).reduce((total, currentValue) => total + (parseFloat(currentValue.charge_amount) || 0), 0)}
                    </td>
                </tr>
            </table>
        </div>
    </body>
    </html>`

  const mailOptions = {
    to: tenantDetails.contact_email,
    from: { email: "manager@rentgatepm.com", name: "RentGatePM Services" },
    subject: `${APP_NAME} Invoice`,
    text: text,
    html: text
  };
  return sendCustomEmail(mailOptions)
}

exports.createFirebaseUser = functions.https.onCall(async (data, context) => {
  try {
    const createdUser = await admin.auth().createUser(data)

    const emailVerificationLink = await admin.auth().generateEmailVerificationLink(createdUser.email,
      {
        url: "https://rentgatepm.com/account-actions/"
      })
    var emailConfirmationTemplate = `
        <div>
        <p>Hello,</p>
        <p>Follow this link to verify your ${createdUser.email} account.</p>
        <p>${emailVerificationLink}</p>
        <p>If you didn’t ask to verify this address, you can ignore this email.</p>
        <p>Thanks,</p>
        <p>Your ${APP_NAME} team</p>
        </div>`
    const mailOptions = {
      to: createdUser.email,
      from: { email: "manager@rentgatepm.com", name: "RentGatePM Services" },
      subject: `Verify email for ${APP_NAME}`,
      text: emailConfirmationTemplate,
      html: emailConfirmationTemplate
    };
    sendCustomEmail(mailOptions)
    return createdUser
  } catch (error) {
    // Throwing an HttpsError so that the client gets the error details.
    throw new functions.https.HttpsError('internal', error.message);
  }
})

exports.adminCreateFirebaseUser = functions.https.onCall(async (data, context) => {
  // Checking that the user is authenticated by checking attribute.
  if (!context.auth) {
    // Throwing an HttpsError so that the client gets the error details.
    throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
      'while authenticated.');
  }
  const adminUserRecord = await admin.auth().getUser(context.auth.uid)
  //user must be admin and have an email
  if (!adminUserRecord.customClaims.admin && !adminUserRecord.email) {
    // Throwing an HttpsError so that the client gets the error details.
    throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
      'by an admin user.');
  }
  try {
    //get tenant database reference
    const adminUserDatabaseRef = admin.firestore().collection("tenant").doc(adminUserRecord.uid)
    //create new user
    const createdUser = await admin.auth().createUser(data)
    //save user record to the database
    await adminUserDatabaseRef.collection("users").doc(createdUser.uid).set({ primary_email: createdUser.email });
    const emailVerificationLink = await admin.auth().generateEmailVerificationLink(createdUser.email,
      {
        url: "https://rentgatepm.com/account-actions/"
      })
    var emailConfirmationTemplate = `
        <div>
        <p>Hello,</p>
        <p>Follow this link to verify your ${createdUser.email} account.</p>
        <p>${emailVerificationLink}</p>
        <p>If you didn’t ask to verify this address, you can ignore this email.</p>
        <p>Thanks,</p>
        <p>Your ${APP_NAME} team</p>
        </div>`
    const mailOptions = {
      to: createdUser.email,
      from: { email: "manager@rentgatepm.com", name: "RentGatePM Services" },
      subject: `Verify email for ${APP_NAME}`,
      text: emailConfirmationTemplate,
      html: emailConfirmationTemplate
    };
    sendCustomEmail(mailOptions)
    return createdUser
  } catch (error) {
    // Throwing an HttpsError so that the client gets the error details.
    throw new functions.https.HttpsError('internal', error.message);
  }
})

exports.updateFirebaseUser = functions.https.onCall(async (data, context) => {
  const { uid, userProfile } = data
  if (!context.auth) {
    // Throwing an HttpsError so that the client gets the error details.
    throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
      'while authenticated.');
  }
  try {
    const updatedUser = await admin.auth().updateUser(uid, userProfile)
    return updatedUser
  } catch (error) {
    // Throwing an HttpsError so that the client gets the error details.
    throw new functions.https.HttpsError('internal', error.message);
  }
})

exports.deleteFirebaseUsers = functions.https.onCall(async (data, context) => {
  const { userIds } = data
  if (!context.auth) {
    // Throwing an HttpsError so that the client gets the error details.
    throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
      'while authenticated.');
  }
  try {
    await admin.auth().deleteUsers(userIds)
    return `Successfully deleted users`
  } catch (error) {
    // Throwing an HttpsError so that the client gets the error details.
    throw new functions.https.HttpsError('internal', error.message);
  }
})

// Set database reference on the user corresponding to uid.
exports.setDatabaseRefCustomClaim = functions.https.onCall(async (data, context) => {
  const userId = data.userId
  if (!userId) {
    // Throwing an HttpsError so that the client gets the error details.
    throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
      'with userId to assign claims to.');
  }
  // Checking that the user is authenticated by checking attribute.
  if (!context.auth) {
    // Throwing an HttpsError so that the client gets the error details.
    throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
      'while authenticated.');
  }
  const userRecord = await admin.auth().getUser(context.auth.uid)
  if (!userRecord.customClaims.admin && !userRecord.email) {
    // Throwing an HttpsError so that the client gets the error details.
    throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
      'while user has confirmed email.');
  }
  const userDatabaseRefCustomClaim = userRecord.customClaims['databaseRef']
  await admin.auth().setCustomUserClaims(userId, { databaseRef: userDatabaseRefCustomClaim })
  return {
    message: 'DatabaseRef claims set successfully!'
  }
})

// Set admin privilege on the user corresponding to uid.
exports.setAdminCustomClaim = functions.https.onCall(async (data, context) => {
  const { userId, userProfile } = data
  if (!userId) {
    // Throwing an HttpsError so that the client gets the error details.
    throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
      'with userId to assign claims to.');
  }
  const userRecord = await admin.auth().getUser(userId)
  if (!userRecord.email) {
    // Throwing an HttpsError so that the client gets the error details.
    throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
      'while user has an email.');
  }
  const userDatabaseRef = admin.firestore().collection("tenant").doc(userRecord.uid)
  //IMPORTANT: create the base db
  userDatabaseRef.set({ something: true }, { merge: true })
  //set admin and database ref custom claims on user
  await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true, databaseRef: userDatabaseRef.id })
  await userDatabaseRef.collection("users").doc(userRecord.uid).set(userProfile);
  await userDatabaseRef.collection("company_profile").doc(userRecord.uid).set({ disabled: false });
  //create the different email templates 
  EMAIL_TEMPLATES.forEach(async emailTemplate => {
    await userDatabaseRef.collection("email-templates").add(emailTemplate);
  })
  return {
    message: 'Claims set successfully!'
  }
})


exports.sendEmail = functions.https.onCall((data, context) => {
  const emailData = data.email;
  const subject = data.subject;
  const recipients = data.recipients;
  const replyTo = data.replyTo;
  // Checking that the user is authenticated.
  // Checking attribute.
  if (!context.auth) {
    // Throwing an HttpsError so that the client gets the error details.
    throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
      'while authenticated.');
  }
  if (!(typeof emailData === 'string') || emailData.length === 0) {
    // Throwing an HttpsError so that the client gets the error details.
    throw new functions.https.HttpsError('invalid-argument', 'The function must be called with ' +
      'one arguments "email" containing the message text to add.');
  }
  if (!(Array.isArray(recipients)) || recipients.length === 0) {
    // Throwing an HttpsError so that the client gets the error details.
    throw new functions.https.HttpsError('invalid-argument', 'The function must be called with ' +
      'one arguments "recepients" containing the recepients of the email.');
  }

  const mailOptions = {
    to: recipients,
    from: { email: "manager@rentgatepm.com", name: "RentGatePM Services" },
    replyTo: replyTo,
    subject: subject,
    text: emailData,
    html: emailData
  };

  return sendCustomEmail(mailOptions)
})


exports.sendEmailTest = functions.https.onRequest((req, res) => {
  const { first_name, last_name, email, phone_number, subject, message } = req.body;
  return cors(req, res, () => {
    var text = `<div>
      <h4>Hello there, how are you?</h4>
      <ul>
        <li>
          Name - ${first_name} ${last_name}
        </li>
        <li>
          Email - ${email}
        </li>
        <li>
          Phone - ${phone_number}
        </li>
      </ul>
      <h4>${subject}</h4>
      <p>${message || "This is the placeholder for an empty message!"}</p>
    </div>`;

    const mailOptions = {
      to: "bwwaweru18@gmail.com",
      from: { email: "manager@rentgatepm.com", name: "RentGatePM Services" },
      subject: `Property Management Software Message`,
      text: text,
      html: text
    };
    const sendEmailResponse = sendCustomEmail(mailOptions)
    res.status(200).send({ message: sendEmailResponse });
  });
})


const getNextDateFromNow = (currentDate, frequency) => {
  let nextDueDate;
  switch (frequency) {
    case "Daily":
      nextDueDate = addDays(currentDate, 1);
      break;
    case "Weekly":
      nextDueDate = addWeeks(currentDate, 1);
      break;
    case "Monthly":
      nextDueDate = addMonths(currentDate, 1);
      break;
    case "Half-Yearly":
      nextDueDate = addMonths(currentDate, 6);
      break;
    case "Yearly":
      nextDueDate = addYears(currentDate, 1);
      break;
    case "Quarterly":
      nextDueDate = addQuarters(currentDate, 1);
      break;
    default:
      nextDueDate = currentDate
      break;
  }
  return nextDueDate;
}


const sendAccountSubscriptionBillCollectionEmail = (subscriptionCharges) => {
  const accountSubscriptionsBillingEmailText = `
  <div>
  <h5>Account billing charges for ${zonedDateString}</h5>
  <table>
    <tr>
        <td>Company Name</td>
        <td>Company Address</td>
        <td>Company Phone Number</td>
        <td>Company Email</td>
        <td>Charge Amounts</td>
    </tr>
    ${Array.from(subscriptionCharges).map(subscriptionCharge =>
    `<tr>
          <td>
            ${subscriptionCharge.company_name}
          </td>
          <td>
            ${subscriptionCharge.company_address}
          </td>
          <td>
            ${subscriptionCharge.company_phone_number}
          </td>
          <td>
            ${subscriptionCharge.company_primary_email}
          </td>
          <td>
            Ksh ${subscriptionCharge.amount}
          </td>
    </tr>`
  )}
  </table>
  </div>`
  const mailOptions = {
    to: ["bwwaweru18@gmail.com", "rentgatepmltd@gmail.com"],
    from: { email: "manager@rentgatepm.com", name: "RentGatePM Services" },
    subject: `${APP_NAME} Accounts Subscription Fees`,
    text: accountSubscriptionsBillingEmailText,
    html: accountSubscriptionsBillingEmailText
  };
  return sendCustomEmail(mailOptions)

}


exports.registerForPayBillPaymentsNotifications = functions.https.onCall((data, context) => {
  const shortCode = data.shortCode;
  const confirmationUrl = ""
  //send a get request to the following with the Base-64 encoding of Consumer Key + ":" + Consumer Secret
  //Create a GET request and set an Authentication header with the value as Basic + encoded value 
  // from above step e.g. using the Consumer Credentials above, the header will be Authorization: Basic
  //https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials
  // The raw request will look similar to the following:
  // GET / oauth / v1 / generate ? grant_type = client_credentials HTTP / 1.1
  // Host: sandbox.safaricom.co.ke
  // Authorization: Basic U1BMd0xkMnVBM29ub1BSWENKRjZiV3FXR3hOdkE4Qlo6NldPZ2hNQUdUdUVZS2pYMw ==
  //   Content - Type: application / json

  //receive the access token from the reply of the above request
  //register the notification urls to the below Safaricom url
  //   // URL
  // [POST] https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl

  // // HEADERS
  // Host: sandbox.safaricom.co.ke
  // Authorization: Bearer [access token]
  // Content-Type: application/json
  // // BODY
  // {
  // 	"ShortCode": "601426",
  // 	"ResponseType": "Completed",
  // 	"ConfirmationURL": "[confirmation URL]",
  // 	"ValidationURL": "[validation URL]"
  // }

  //a successful result looks like: 
  // {
  //   "ConversationID": "",
  //   "OriginatorCoversationID": "",
  //   "ResponseDescription": "success"
  // }

  axios.post("POST url", { data: "DATA" })
    .then(response => console.log(response))
    .catch(error => console.log("axios post error => ", error));

})


exports.getPaybillPaymentNotifications = functions.https.onRequest((req, res) => {
  const notifBody = req.body
  const { BusinessShortCode, TransID, TransAmount, TransTime, BillRefNumber, MSISDN, }
    = notifBody
  //here we have got the client paybill number as BusinessShortCode, so we can find out what client/user
  //has this paybill under their profile.
  //get each tenant/subscribed user from the database
  await firestoreDatabase
    .where("mpesa_paybill_numbers", "array-contains", BusinessShortCode).get()
    .then(querySnap => {
      if (!querySnap.empty) {
        //if the result is not empty, get a reference to the tenantUser database
        const tenantUserDatabaseReference = querySnap.docs[0].ref
        //get the charges that are not paid in full and match the tenant id above
        const UNPAID_CHARGES = await tenantUserDatabaseReference.collection('unit-charges')
          .where('tenant_id', '==', BillRefNumber)
          .where('paid_in_full', '==', false).get()
          .then((querySnapshot) => querySnapshot.docs)

        if (UNPAID_CHARGES.length) {
          //while there are still remaining unpaid charges and the payment amount is above 0, 
          // pay the next charge
          let totalAmountPayedByTenantInTransaction = parseFloat(TransAmount);
          //format the transaction time into proper date
          const transactionTime = TransTime.slice(0, 4) + "-" + TransTime.slice(4, 6) + "-" + TransTime.slice(6, 8)
          //loop through the charges that have not been fully paid and make payments for each of them.
          for (const UNPAID_CHARGE of UNPAID_CHARGES) {
            if (totalAmountPayedByTenantInTransaction > 0) {
              //MAKE A PAYMENT TO THE CHARGE HERE
              const { charge_amount, charge_type, charge_label, tenant_id, property_id, unit_id } = UNPAID_CHARGE.data()
              const chargeAmount = parseFloat(charge_amount)
              const chargeAmountToBePaid = totalAmountPayedByTenantInTransaction >= chargeAmount ? chargeAmount : totalAmountPayedByTenantInTransaction
              //CONSTRUCT A PAYMENT OBJECT HERE FOR SAVING
              const tenantPaymentForCharge = {
                payed_amount: chargeAmountToBePaid,
                payment_date: transactionTime,
                payment_label: charge_label,
                payment_type: charge_type,
                charge_id: UNPAID_CHARGE.id,
                tenant_id: tenant_id,
                property_id: property_id,
                unit_id: unit_id,
                transaction_type: "Mpesa-Paybill",
                reference_id: TransID,
                phone_number_used: MSISDN,
              };
              //SAVE THE PAYMENT IN THE DATABASE
              await tenantUserDatabaseReference.collection('charge-payments').add(tenantPaymentForCharge).then(result => {
                //SHOW THAT THE CHARGE IS PAID AND WHETHER FULLY OR NOT
                await UNPAID_CHARGE.ref.update({ paid: true, paid_in_full: (chargeAmountToBePaid === chargeAmount) })
                totalAmountPayedByTenantInTransaction = (totalAmountPayedByTenantInTransaction - chargeAmount)
              });
            } else {
              break;
            }
          }
          //GET the tenant whose id number matches the billrefnumber above to send a receipt via phone number or email
          await tenantUserDatabaseReference.collection('contacts')
            .where('id_number', '==', BillRefNumber).limit(1).get()
            .then((querySnapshot) => {
              if (!querySnapshot.empty) {
                //here we have the details of the tenant that corresponded to the BillRefNumber
                const userDetails = querySnap.docs[0].data();
              }
            })
        };
      }
      //then we don't know who this paybill number belongs to.
    });
  //here the BillRefNumber is supposed to mean the tenant's id number which we can then use to access
  //their details and charges history. We thereafter apply the payment to those charges, if any, 
  // the notification ought to look like so: it is a post request to us
  // BODY
  // {
  //   "TransactionType": "",
  //   "TransID": "LHG31AA5TX",
  //   "TransTime": "20170816190243",
  //   "TransAmount": "200.00",
  //   "BusinessShortCode": "601426",
  //   "BillRefNumber": "account",
  //   "InvoiceNumber": "",
  //   "OrgAccountBalance": "",
  //   "ThirdPartyTransID": "",
  //   "MSISDN": "254708374149",
  //   "FirstName": "John",
  //   "MiddleName": "",
  //   "LastName": "Doe"
  // }
});


exports.monthlyScheduledFunction = functions.pubsub.schedule('0 0 1 * *')
  .timeZone('Africa/Nairobi')
  .onRun(async (context) => {
    try {
      const tenantUserQuerySnapshot = await firestoreDatabase.get()
      tenantUserQuerySnapshot.forEach(async (doc) => {
        const tenantUserId = doc.id;
        const tenantUserDatabaseReference = firestoreDatabase.doc(tenantUserId);
        // get the company profile 
        const companyProfile = await tenantUserDatabaseReference.collection('company_profile')
          .where("billing_enabled", "==", true).limit(1).get()
          .then((querySnapshot) => {
            console.log("Company Profile => ", querySnapshot.docs)
            if (querySnapshot.empty) {
              return {}
            } else {
              const companyProfileDoc = querySnapshot.docs[0]
              return companyProfileDoc.data()
            }
          }).catch(error => console.log("Error getting company profile objects"))
        // get the number of units belonging to the tenant
        await tenantUserDatabaseReference.collection('property_units').get()
          .then(async querySnapshot => {
            const totalTenantUnits = parseInt(querySnapshot.size)
            const totalCurrrentMonthCharges = totalTenantUnits * SINGLE_UNIT_MANAGEMENT_CHARGE
            const accountBillingObject = {
              billing_date: zonedDateString,
              invoice_number: `${zonedDateString} - ${companyProfile.company_name} `,
              amount: totalCurrrentMonthCharges,
            }
            sendAccountSubscriptionBillCollectionEmail([Object.assign({}, companyProfile, { amount: totalCurrrentMonthCharges })])
            //send email invoice to user
            sendInvoice(COMPANY_DETAILS_CONFIG, {
              first_name: companyProfile.company_name,
              id_number: companyProfile.company_address,
              personal_phone_number: companyProfile.company_phone_number,
              contact_email: companyProfile.company_primary_email,
            },
              [
                {
                  charge_label: "Account subscription charge",
                  due_date: zonedDateString,
                  charge_amount: totalCurrrentMonthCharges
                }
              ])
            //post account biliing charges to user's legder
            return await tenantUserDatabaseReference.collection('account-billing').add(accountBillingObject);
          }).catch(error => console.log('Error getting property units to count => ', error))
      })
      return null;
    } catch (error_1) {
      console.log("Error occurred in monthlyScheduledFunction => ", error_1)
      return null;
    }
  })

exports.scheduledFunction = functions.pubsub.schedule('0 0 * * *')
  .timeZone('Africa/Nairobi')
  .onRun(async (context) => {
    //get the current date and date string at the appropriate timezone ie Africa/Nairobi
    const currentDate = utcToZonedTime(context.timestamp, timeZone)
    const currentDateString = format(currentDate, 'yyyy-MM-dd')
    try {
      //get each tenant/subscribed user from the database
      const tenantUserQuerySnapshot = await firestoreDatabase.get();
      //loop through each and perform actions as required
      return tenantUserQuerySnapshot.forEach(async (doc) => {
        //get the tenant id
        const tenantUserId = doc.id;
        //get a reference to the tenant database
        //this also helps in referencing later on
        const tenantUserDatabaseReference = firestoreDatabase.doc(tenantUserId);
        /* PERFORM OUR ACTIONS HERE AS REQUIRED */
        // get all vacating notices that are due for termination today
        await tenantUserDatabaseReference.collection('notices').where('vacating_date', '==', currentDateString)
          .get().then((querySnapshot) => {
            return querySnapshot.forEach(async (noticeDoc) => {
              const docData = noticeDoc.data();
              const { lease_id } = docData;
              //terminate lease with lease_id
              await noticeDoc.ref.update({ actual_vacated_date: currentDateString, vacated: true })
              //get details of the lease that should be terminated
              await tenantUserDatabaseReference.collection('leases').doc(lease_id).get().then(async leaseToTerminateSnap => {
                const { security_deposit, tenants, water_deposit, unit_id, property_id } = leaseToTerminateSnap.data()
                leaseToTerminateSnap.ref.update({ end_date: currentDateString, terminated: true })
                //add an expense for the security and water deposit refunds
                const securityDepositAmount = parseFloat(security_deposit) || 0
                const waterDepositAmount = parseFloat(water_deposit) || 0
                if (securityDepositAmount) {
                  await tenantUserDatabaseReference.collection('expenses').add(
                    {
                      amount: securityDepositAmount, type: "security_deposit_refund",
                      unit_id: unit_id, property_id: property_id, tenant_id: tenants[0],
                      expense_date: currentDateString, expense_notes: "Security deposit refund"
                    })
                }
                if (waterDepositAmount) {
                  await tenantUserDatabaseReference.collection('expenses').add(
                    {
                      amount: waterDepositAmount, type: "water_deposit_refund",
                      unit_id: unit_id, property_id: property_id, tenant_id: tenants[0],
                      expense_date: currentDateString, expense_notes: "Water deposit refund"
                    })
                }
                return null;
              })
            })
          }).catch(error => {
            console.log('Error getting vacating notices to terminate leases => ', error)
            return null;
          });
        //POST RENT LATE FEES CHARGES
        //get rent charges that have no payments
        await tenantUserDatabaseReference.collection('transactions-charges')
          .where('charge_type', '==', "rent").where("payed", "==", false).get()
          .then(async (unpaidRentChargesSnapshot) => {
            const unpaidRentCharges = []
            //get unpaid rent objects from snapshot
            unpaidRentChargesSnapshot.forEach(unpaidRentSnap =>
              unpaidRentCharges.push(Object.assign({}, { id: unpaidRentSnap.id }, unpaidRentSnap.data())))
            //get all the property settings in order post late fee charges according to used criteria
            const propertySettings = await tenantUserDatabaseReference.collection('property-settings').get()
              .then((propertySettingsSnapshot) => {
                const propertySettingsArray = []
                propertySettingsSnapshot.forEach(snap => propertySettingsArray.push(snap.data()))
                return propertySettingsArray
              })
            //for each unpaid rent charge get property settings to determine criteria
            return unpaidRentCharges.forEach(async unpaidRentCharge => {
              const propertySettingsForCharge = propertySettings
                .find(({ property_id }) => property_id === unpaidRentCharge.property_id)
              if (propertySettingsForCharge && propertySettingsForCharge.late_fees_charges_activated) {
                // go ahead and post late fees charges according to criteria
                const lateFeesGracePeriod = parseInt(propertySettingsForCharge.grace_period) || 0
                const lateFeeMaxAmount = parseFloat(propertySettingsForCharge.late_fee_max_amount) || 0
                const lateFeeAmount = parseFloat(propertySettingsForCharge.late_fee_amount) || 0
                const lateFeeFrequency = propertySettingsForCharge.late_fee_frequency || "one_time_fee"
                const chargeDueDate = parse(unpaidRentCharge.due_date, 'yyyy-MM-dd', new Date())
                //get first date to post charges taking into account grace period days
                const firstDateToPostCharge = addDays(chargeDueDate, lateFeesGracePeriod)
                if (lateFeeMaxAmount && lateFeeAmount) {
                  const lastDateToPostCharge = addDays(firstDateToPostCharge, parseInt(lateFeeMaxAmount / lateFeeAmount))
                  if (isWithinInterval(currentDate, { start: firstDateToPostCharge, end: lastDateToPostCharge })) {
                    //this now qualifies all the criteria. Post the late fee charges here
                    const lateFeeChargeToPost = {
                      payed: false,
                      charge_amount: lateFeeAmount,
                      charge_date: currentDateString,
                      charge_label: "Rent Late Fee",
                      charge_type: "rent_late_fee",
                      due_date: currentDateString,
                      tenant_id: unpaidRentCharge.tenant_id,
                      property_id: unpaidRentCharge.property_id,
                      unit_id: unpaidRentCharge.unit_id,
                    };
                    if (lateFeeFrequency === "one_time_fee") {
                      //make the charge disappear forever by setting payed to true
                      //that way it is never gotten again 
                      await tenantUserDatabaseReference.collection('transactions-charges').doc(unpaidRentCharge.id)
                        .update({ payed: true });
                    }
                    return await tenantUserDatabaseReference.collection('transactions-charges').add(lateFeeChargeToPost);
                  }
                  return null;
                }
              } else {
                //property settings unvailable or not activated
                return null;
              }
            })
          }).catch(error => {
            console.log('Error getting rent charges without payments => ', error)
            return null;
          })
        //END OF POSTING LATE FEES CHARGES //
      });
    } catch (scheduledFunctionError) {
      console.log("Error in scheduledFunction => ", scheduledFunctionError);
      return null
    }
  })

exports.RentScheduledFunction = functions.pubsub.schedule('0 1 * * *')
  .timeZone('Africa/Nairobi')
  .onRun(async (context) => {
    //get the current date and date string at the appropriate timezone ie Africa/Nairobi
    const currentDate = utcToZonedTime(context.timestamp, timeZone)
    const currentDateString = format(currentDate, 'yyyy-MM-dd')
    try {
      //get each tenant/subscribed user from the database
      const tenantUserQuerySnapshot = await firestoreDatabase.get();
      //loop through each and perform actions as required
      tenantUserQuerySnapshot.docs.map(async (tenantUserDoc) => {
        //get a reference to the tenant database
        //this also helps in referencing later on
        const tenantUserDatabaseReference = tenantUserDoc.ref;
        //GET ALL ACTIVE LEASES AND POST CHARGES TO TENANT LEDGERS
        const rentDueSnapDocs = await tenantUserDatabaseReference.collection('leases')
          .where('lease_type', '==', 'Fixed w/rollover')
          .where('rent_due_date', '==', currentDateString)
          .where('terminated', '==', false).get()
          .then((querySnapshot) => querySnapshot.docs)

        //write to the database in batches of a hundred items
        var size = 80;
        for (var i = 0; i < rentDueSnapDocs.length; i += size) {
          const batch = firestoreDatabase.firestore.batch()
          rentDueSnapDocs.slice(i, i + size).map(leaseDoc => {
            let rentChargeToPost = leaseDoc.data()
            const { rent_amount, tenants, unit_id, rent_cycle, property_id } = rentChargeToPost;
            //POST THE RENT CHARGE TO THE TENANT LEDGER HERE
            //FOR EACH DUE RENT, POST A CHARGE TO INDIVIDUAL TENANT LEDGER
            const chargeToPost = {
              payed: false,
              charge_amount: rent_amount,
              charge_date: currentDateString,
              charge_label: "Rent",
              charge_type: "rent",
              due_date: currentDateString,
              tenant_id: tenants[0],
              property_id: property_id,
              unit_id: unit_id,
            };
            batch.set(tenantUserDatabaseReference.collection('transactions-charges').doc(), chargeToPost)
            //change the dates on the unit-charges to next date when they are due 
            const rentNextDueDate = getNextDateFromNow(currentDate, rent_cycle)
            //change the next rent due date and save the updated lease to database
            batch.update(leaseDoc.ref, { rent_due_date: format(rentNextDueDate, 'yyyy-MM-dd') })
          })
          batch.commit();
        }
      })
      return null;
    } catch (rentScheduledFunctionError) {
      console.log("Error in rent scheduledFunction => ", rentScheduledFunctionError);
      return null
    }
  })

// exports.ToDoScheduledFunction = functions.pubsub.schedule('0 1 * * *')
//   .timeZone('Africa/Nairobi')
//   .onRun(async (context) => {
//     //get the current date and date string at the appropriate timezone ie Africa/Nairobi
//     const currentDate = utcToZonedTime(context.timestamp, timeZone)
//     const currentDateString = format(currentDate, 'yyyy-MM-dd')
//     try {
//       //get each tenant/subscribed user from the database
//       const tenantUserQuerySnapshot = await firestoreDatabase.get();
//       //loop through each and perform actions as required
//       tenantUserQuerySnapshot.forEach(async (tenantUserDoc) => {
//         //get the tenant id
//         const tenantUserId = tenantUserDoc.id;
//         //get a reference to the tenant database
//         //this also helps in referencing later on
//         const tenantUserDatabaseReference = firestoreDatabase.doc(tenantUserId);
//         //GET ALL ACTIVE LEASES AND POST CHARGES TO TENANT LEDGERS
//         const toDosUpForReminder = await tenantUserDatabaseReference.collection('to-dos')
//           .where('complete_status', '==', "false")
//           .where('reminder_date', '==', currentDateString).get()
//           .then((querySnapshot) => querySnapshot.docs)
//           .then(snapDocs => snapDocs.map(toDoDoc =>
//             Object.assign({}, { id: toDoDoc.id }, toDoDoc.data())))
//           .catch(error => {
//             console.log('Error in getting toDos up for today => ', error);
//             return [];
//           });
//         //SEND A REMINDER EMAIL HERE TO SUBSCRIBED USERS
//         //GET THE DETAILS OF THE SUBSCRIBED USERS HERE
//         const usersToSendReminderTo = []
//         const mailOptions = {
//           to: usersToSendReminderTo,
//           from: { email: "manager@rentgatepm.com", name: "RentGatePM Services" },
//           replyTo: "manager@rentgatepm.com",
//           subject: "RentGatePM To Dos Reminders",
//           text: toDosUpForReminder,
//           html: toDosUpForReminder,
//         };
//         return sendCustomEmail(mailOptions)
//       });
//       return null;
//     } catch (toDosScheduledFunctionError) {
//       console.log("Error in ToDosScheduledFunction => ", toDosScheduledFunctionError);
//       return null;
//     }
//   })

// exports.OtherChargesScheduledFunction = functions.pubsub.schedule('0 1 * * *')
//   .timeZone('Africa/Nairobi')
//   .onRun(async (context) => {
//     //get the current date and date string at the appropriate timezone ie Africa/Nairobi
//     const currentDate = utcToZonedTime(context.timestamp, timeZone)
//     const currentDateString = format(currentDate, 'yyyy-MM-dd')
//     try {
//       //get each tenant/subscribed user from the database
//       const tenantUserQuerySnapshot = await firestoreDatabase.get();
//       //loop through each and perform actions as required
//       return tenantUserQuerySnapshot.forEach(async (tenantUserDoc) => {
//         //get the tenant id
//         const tenantUserId = tenantUserDoc.id;
//         //get a reference to the tenant database
//         //this also helps in referencing later on
//         const tenantUserDatabaseReference = firestoreDatabase.doc(tenantUserId);
//         //GET ALL ACTIVE LEASES AND POST CHARGES TO TENANT LEDGERS
//         const activeLeases = await tenantUserDatabaseReference.collection('leases')
//           .where('terminated', '==', false).get()
//           .then((querySnapshot) => querySnapshot.docs)
//           .then(snapDocs => snapDocs.map(leaseDoc =>
//             Object.assign({}, { id: leaseDoc.id }, leaseDoc.data())))
//           .catch(error => {
//             console.log('Error in getting active leases charges to post => ', error);
//             return [];
//           });
//         //map active leases to their unit_ids 
//         const unitsWithActiveLeases = activeLeases.map(({ unit_id }) => unit_id)
//         //GET ALL UNIT CHARGES THAT ARE DUE TO BE CHARGED TODAY
//         const unitChargesToBePostedToday = await tenantUserDatabaseReference.collection('unit-charges').where('due_date', '==', currentDateString)
//           .get().then((querySnapshot) => querySnapshot.docs.map(unitChargeDoc =>
//             Object.assign({}, unitChargeDoc.data(), { id: unitChargeDoc.id })))
//         //get all charges with active leases
//         unitChargesToBePostedToday.filter(({ unit_id }) => unitsWithActiveLeases.includes(unit_id))
//           .forEach(async (unitChargeDoc) => {
//             const { frequency, amount, tenant_id, unit_id, charge_label, type } = unitChargeDoc;
//             //post charges to tenant ledger here
//             const chargeToPost = {
//               payed: false,
//               charge_amount: amount,
//               charge_date: currentDateString,
//               charge_label: charge_label,
//               charge_type: type,
//               due_date: currentDateString,
//               tenant_id: tenant_id,
//               unit_id: unit_id,
//             };
//             await tenantUserDatabaseReference.collection('transactions-charges').add(chargeToPost);
//             //change the dates on the unit-charges to next date when they are due 
//             if (type === 'recurring_charge') {
//               const nextDueDate = getNextDateFromNow(currentDate, frequency)
//               unitChargeDoc.due_date = format(nextDueDate, 'yyyy-MM-dd');
//               //save the unit-charge to database
//               await tenantUserDatabaseReference.collection('unit-charges').doc(unitChargeDoc.id).update(unitChargeDoc);
//             }
//           });
//         return null;
//       });
//     } catch (OtherChargesScheduledFunctionError) {
//       console.log("Error in OtherChargesScheduledFunction => ", OtherChargesScheduledFunctionError);
//       return null
//     }
//   })
