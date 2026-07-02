export type EmailClassification =
  | 'Application Confirmation'
  | 'Assessment'
  | 'Interview Invitation'
  | 'Interview Reminder'
  | 'Offer Letter'
  | 'Rejected'
  | 'Waitlisted'
  | 'General Updates'

export interface EmailClassifier {
  classify(subject: string, body: string): EmailClassification
}

export class KeywordEmailClassifier implements EmailClassifier {
  classify(subject: string, body: string): EmailClassification {
    const text = `${subject} ${body}`.toLowerCase()

    // 1. Offer Letter
    if (
      text.includes('offer letter') ||
      text.includes('job offer') ||
      (text.includes('congratulations') && 
        (text.includes('pleased to offer') || 
         text.includes('offer of employment') || 
         text.includes('join our team') ||
         text.includes('hiring team is thrilled') ||
         text.includes('offer details')))
    ) {
      return 'Offer Letter'
    }

    // 2. Rejected
    if (
      text.includes('not moving forward') ||
      text.includes('unfortunately') ||
      text.includes('not selected') ||
      text.includes('unable to offer') ||
      text.includes('pursue other candidates') ||
      text.includes('we are sorry to inform') ||
      text.includes('thank you for your time') && (text.includes('not be proceeding') || text.includes('other applicants'))
    ) {
      return 'Rejected'
    }

    // 3. Interview Invitation
    if (
      text.includes('interview invitation') ||
      text.includes('schedule an interview') ||
      text.includes('schedule your interview') ||
      text.includes('invite you to interview') ||
      text.includes('interview query') ||
      text.includes('interview stage') ||
      (text.includes('interview') && 
        (text.includes('schedule') || 
         text.includes('calendly') || 
         text.includes('book a time') || 
         text.includes('availability') ||
         text.includes('chat with us') ||
         text.includes('discuss your application')))
    ) {
      return 'Interview Invitation'
    }

    // 4. Interview Reminder
    if (
      text.includes('reminder') &&
      (text.includes('interview') || text.includes('meeting') || text.includes('zoom') || text.includes('google meet'))
    ) {
      return 'Interview Reminder'
    }

    // 5. Assessment
    if (
      text.includes('online assessment') ||
      text.includes('coding test') ||
      text.includes('hackerrank') ||
      text.includes('codesignal') ||
      text.includes('technical assessment') ||
      text.includes('take-home') ||
      text.includes('assessment invitation') ||
      text.includes('coding challenge') ||
      text.includes('hackerearth') ||
      text.includes('leetcode challenge')
    ) {
      return 'Assessment'
    }

    // 6. Waitlisted
    if (
      text.includes('waitlist') ||
      text.includes('waitlisted') ||
      text.includes('waiting list') ||
      text.includes('on hold') ||
      text.includes('keep you on file')
    ) {
      return 'Waitlisted'
    }

    // 7. Application Confirmation
    if (
      text.includes('application received') ||
      text.includes('thank you for applying') ||
      text.includes('application confirmation') ||
      text.includes('received your application') ||
      text.includes('successfully submitted') ||
      text.includes('application submitted') ||
      text.includes('submitted your application')
    ) {
      return 'Application Confirmation'
    }

    return 'General Updates'
  }
}

export class ClassifierService {
  private classifier: EmailClassifier = new KeywordEmailClassifier()

  /**
   * Classify an email's subject and body using the active classifier.
   */
  classify(subject: string, body: string): EmailClassification {
    return this.classifier.classify(subject, body)
  }

  /**
   * Swap the classification engine (e.g. to run AI classifications)
   */
  setClassifier(newClassifier: EmailClassifier) {
    this.classifier = newClassifier
  }
}

export const classifierService = new ClassifierService()
