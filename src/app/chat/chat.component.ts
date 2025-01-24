import { Component, output, signal, Signal } from '@angular/core';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {FormsModule} from '@angular/forms';

interface Message {
  text: string;
  sender: 'user'|'bot';
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
  imports: [MatInputModule, FormsModule, MatFormFieldModule],
  standalone: true,
  providers: []
})
export class ChatComponent {
  protected messages: Signal<Message[]> = signal([]);
  protected prompt = '';

  message = output<string>();

  sendMessage() {
    this.message.emit(this.prompt);
    this.prompt = '';
  }
}
