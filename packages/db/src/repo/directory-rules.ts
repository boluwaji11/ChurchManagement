/**
 * R3.2 to R3.4. What one member may see of another.
 *
 * Pure, because the same answer has to come out on the screen, in the printed
 * directory and in the PDF (R3.5), and a second implementation is how a church
 * ends up publishing an address somebody hid.
 *
 * The defaults are the whole argument. Name only. A church that imports two
 * hundred people has consent from none of them, so everything else stays off
 * until the member turns it on.
 */

export interface Visibility {
  listed: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showAddress: boolean;
  showBirthday: boolean;
  showPhoto: boolean;
  showChildren: boolean;
}

/** What somebody who has never opened the setting gets. */
export const DEFAULT_VISIBILITY: Visibility = {
  listed: true,
  showEmail: false,
  showPhone: false,
  showAddress: false,
  showBirthday: false,
  showPhoto: false,
  showChildren: false,
};

export interface DirectoryPerson {
  id: string;
  name: string;
  isChild: boolean;
  email: string | null;
  phone: string | null;
  address: string | null;
  birthday: string | null;
  photoKey: string | null;
}

export interface DirectoryEntry {
  id: string;
  name: string;
  isChild: boolean;
  email: string | null;
  phone: string | null;
  address: string | null;
  birthday: string | null;
  photoKey: string | null;
}

/**
 * One person as the directory shows them, or null when they are not in it.
 *
 * A child is never shown with contact details, whatever anybody has set, and
 * appears at all only because the head of their household said so. That is
 * R3.4, and it is not a preference a child's own row can override.
 */
export function entryFor(
  person: DirectoryPerson,
  own: Visibility,
  householdHead: Visibility | null,
): DirectoryEntry | null {
  if (person.isChild) {
    const head = householdHead ?? DEFAULT_VISIBILITY;
    if (!head.showChildren || !own.listed) return null;
    return {
      id: person.id,
      name: person.name,
      isChild: true,
      email: null,
      phone: null,
      address: null,
      birthday: null,
      photoKey: head.showPhoto ? person.photoKey : null,
    };
  }

  if (!own.listed) return null;

  return {
    id: person.id,
    name: person.name,
    isChild: false,
    email: own.showEmail ? person.email : null,
    phone: own.showPhone ? person.phone : null,
    address: own.showAddress ? person.address : null,
    birthday: own.showBirthday ? person.birthday : null,
    photoKey: own.showPhoto ? person.photoKey : null,
  };
}
