import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import type { StreamError } from '../../models/errors.model';

/**
 * Dedicated channel for unrecoverable stream failures.
 * Per-entity change Observables never emit errors; they push through this subject
 * and the effects layer subscribes to it globally.
 */
@Injectable({ providedIn: 'root' })
export class StreamErrorService {
  private readonly subject = new Subject<StreamError>();

  readonly stream$ = this.subject.asObservable();

  emit(error: StreamError): void {
    this.subject.next(error);
  }
}
