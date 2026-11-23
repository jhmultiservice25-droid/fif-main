import { Component } from '@angular/core';
import { Hero } from '../ui/hero/hero';
import { Concept } from '../ui/concept/concept';
import { Experiences } from '../ui/experiences/experiences';
import { Impact } from '../ui/impact/impact';
import { Program } from '../ui/program/program';
import { FestivalCountdowns } from '../ui/festival-countdowns/festival-countdowns';
import { Speakers } from '../ui/speakers/speakers';

@Component({
  imports: [Hero, FestivalCountdowns, Concept, Experiences, Program, Speakers, Impact],
  templateUrl: './landing.html'
})
export default class Landing {}
