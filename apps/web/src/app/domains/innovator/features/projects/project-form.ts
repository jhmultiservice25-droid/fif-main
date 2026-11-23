import { httpResource } from '@angular/common/http';
import { Component, effect, inject, input, OnInit, signal } from '@angular/core';
import { form, FormField, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { Toast } from '@/app/core/toast';
import { IApiSuccess, IProject } from '@/app/shared/interfaces';
import { MarketplaceCatalogStore } from '@/app/shared/data-access';
import { Steps } from '@/app/shared/ui/steps/steps';
import { InnovatorStore } from '../../data-access';

interface IProjectFormModel {
  status: 'DRAFT' | 'SUBMITTED';
  title: string;
  problemSolved: string;
  solution: string;
  sectors: string[];
  capabilities: string[];
  stage: string;
  publicationConsent: 'NAMED' | 'ANONYMOUS' | 'NO' | 'DISCUSS';
}

type IConsent = IProjectFormModel['publicationConsent'];

const CONSENT_HINTS: Record<IConsent, string> = {
  NAMED: 'Visible dans la marketplace, avec votre nom.',
  ANONYMOUS: 'Visible dans la marketplace, sans votre nom.',
  NO: 'Non publié dans la marketplace.',
  DISCUSS: 'Non publié pour l’instant, à convenir avec l’équipe FIF.'
};

const MAX_VIDEO_SECONDS = 120;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

const defaultProjectModel = (): IProjectFormModel => ({
  status: 'DRAFT',
  title: '',
  problemSolved: '',
  solution: '',
  sectors: [],
  capabilities: [],
  stage: '',
  publicationConsent: 'DISCUSS'
});

@Component({
  templateUrl: './project-form.html',
  providers: [InnovatorStore],
  imports: [
    FormField,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    RouterLink,
    Steps
  ]
})
export default class ProjectForm implements OnInit {
  readonly id = input<string | undefined>();

  protected readonly store = inject(InnovatorStore);
  protected readonly catalogStore = inject(MarketplaceCatalogStore);
  private readonly router = inject(Router);
  private readonly toast = inject(Toast);

  protected readonly steps = ['Le projet', 'Classification', 'Vidéo et publication'];
  protected readonly step = signal(0);

  protected readonly pitchVideo = signal<{ file: File; durationSeconds: number } | null>(null);
  protected readonly existingVideoName = signal<string | null>(null);
  protected readonly pitchVideoError = signal('');

  protected readonly projectResource = httpResource<IApiSuccess<IProject>>(() => {
    const projectId = this.id();
    return projectId && projectId !== 'nouveau' ? `/me/projects/${encodeURIComponent(projectId)}` : undefined;
  });

  protected readonly model = signal<IProjectFormModel>(defaultProjectModel());
  protected readonly projectForm = form(this.model, (schemaPath) => {
    required(schemaPath.title);
    required(schemaPath.problemSolved);
    required(schemaPath.solution);
  });

  protected readonly isNew = () => !this.id() || this.id() === 'nouveau';

  constructor() {
    effect(() => {
      if (this.projectResource.hasValue()) {
        const project = this.projectResource.value().data;
        this.model.set({
          status: project.status,
          title: project.title,
          problemSolved: project.problemSolved,
          solution: project.solution,
          sectors: [...project.sectors],
          capabilities: [...project.capabilities],
          stage: project.stage,
          publicationConsent: project.publicationConsent
        });
        this.existingVideoName.set(
          project.pitchVideoPath ? project.pitchVideoOriginalName || 'Vidéo de présentation' : null
        );
      }
    });

    effect(() => {
      const message = this.store.error();
      if (message) {
        this.toast.error(message, 'Enregistrement impossible');
        this.store.clearError();
      }
    });

    let revision = 0;
    effect(() => {
      if (this.store.revision() > revision) {
        revision = this.store.revision();
        this.toast.success(this.submitting ? 'Projet soumis.' : 'Brouillon enregistré.');
        void this.router.navigate(['/innovateur/projets']);
      }
    });
  }

  private submitting = false;

  ngOnInit(): void {
    this.catalogStore.load().subscribe();
  }

  protected consentHint(value: string): string {
    return CONSENT_HINTS[value as IConsent] ?? '';
  }

  protected selectConsent(value: string): void {
    this.model.update((model) => ({ ...model, publicationConsent: value as IConsent }));
  }

  protected formatDuration(seconds: number): string {
    const rounded = Math.round(seconds);
    return `${Math.floor(rounded / 60)} min ${String(rounded % 60).padStart(2, '0')} s`;
  }

  protected formatSize(bytes: number): string {
    return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
  }

  protected onPitchVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    this.pitchVideoError.set('');
    if (!file) return;
    if (file.size > MAX_VIDEO_BYTES) {
      this.pitchVideoError.set('La vidéo ne doit pas dépasser 200 Mo.');
      return;
    }

    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (!Number.isFinite(video.duration) || video.duration <= 0 || video.duration > MAX_VIDEO_SECONDS) {
        this.pitchVideoError.set('La vidéo doit durer 2 minutes maximum.');
        return;
      }
      this.pitchVideo.set({ file, durationSeconds: video.duration });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      this.pitchVideoError.set('Impossible de lire la durée de cette vidéo.');
    };
    video.src = url;
  }

  protected save(asSubmitted = false): void {
    submit(this.projectForm, async () => {
      const value = this.model();
      this.submitting = asSubmitted;
      this.store.saveProject({
        id: this.isNew() ? null : this.id()!,
        payload: {
          status: value.status,
          title: value.title,
          problemSolved: value.problemSolved,
          solution: value.solution,
          sectors: value.sectors,
          capabilities: value.capabilities,
          stage: value.stage,
          publicationConsent: value.publicationConsent
        },
        video: this.pitchVideo(),
        submit: asSubmitted
      });
    });
  }
}
