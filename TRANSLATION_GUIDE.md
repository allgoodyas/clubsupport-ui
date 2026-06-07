TRANSLATION USAGE IN ANGULAR TEMPLATES
======================================

## Basic Usage:

1. Simple Text:
   {{ 'COMMON.SAVE' | translate }}
   Output: "Save" or "حفظ"

2. With Parameters:
   {{ 'DASHBOARD.WELCOME' | translate:{name: userName} }}
   Output: "Welcome back, Ahmed!" or "مرحباً بعودتك، أحمد!"

3. In Attributes:
   <input [placeholder]="'AUTH.MOBILE_NUMBER' | translate">

4. In Properties:
   <button [attr.aria-label]="'COMMON.LOGOUT' | translate">

## EXAMPLES FOR YOUR COMPONENTS:

### Login Page Example:
<h1>{{ 'AUTH.LOGIN_TITLE' | translate }}</h1>
<label>{{ 'AUTH.MOBILE_NUMBER' | translate }}</label>
<button>{{ 'COMMON.CONTINUE' | translate }}</button>

### With Loading State:
<span *ngIf="!isLoading">{{ 'COMMON.LOGIN' | translate }}</span>
<span *ngIf="isLoading">{{ 'AUTH.LOGGING_IN' | translate }}</span>

### With Dynamic Values:
<p>{{ 'AUTH.WELCOME_BACK' | translate:{name: fullName} }}</p>
Output: "Welcome back, Ahmed!" or "مرحباً بعودتك، أحمد!"

## TRANSLATION KEYS AVAILABLE:

COMMON:
- SAVE, CANCEL, DELETE, EDIT, CREATE, UPDATE
- BACK, NEXT, CONTINUE, DONE, CLOSE
- LOGOUT, LOGIN, LOADING, SEARCH, FILTER

AUTH:
- LOGIN_TITLE, MOBILE_NUMBER, PASSWORD
- ENTER_MOBILE, WELCOME_BACK, SELECT_CLUB
- REMEMBER_ME, CHECKING, LOGGING_IN

DASHBOARD:
- WELCOME, STUDENTS, USERS, EVENTS, PAYMENTS
- QUICK_ACTIONS, ADD_STUDENT, CREATE_EVENT

MASTER_ADMIN:
- TITLE, SUBTITLE, TOTAL_CLUBS, CREATE_NEW_CLUB

CREATE_CLUB:
- TITLE, CLUB_NAME_EN, CLUB_NAME_AR, CLUB_CODE
- ADMIN_CREDENTIALS, TEMPORARY_PASSWORD

VALIDATION:
- MOBILE_REQUIRED, MOBILE_INVALID
- PASSWORD_REQUIRED, EMAIL_INVALID

MESSAGES:
- LOGIN_SUCCESS, CLUB_CREATED, ERROR_OCCURRED
