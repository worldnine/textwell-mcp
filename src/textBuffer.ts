export class TextBuffer {
  private currentText: string = '';
  private lastUpdated: Date | null = null;
  
  set(text: string): void {
    this.currentText = text;
    this.lastUpdated = new Date();
  }
  
  get(): { text: string; lastUpdated: Date | null } {
    return {
      text: this.currentText,
      lastUpdated: this.lastUpdated
    };
  }

  clear(): void {
    this.currentText = '';
    this.lastUpdated = null;
  }

  isEmpty(): boolean {
    return this.currentText === '';
  }

  getLastUpdatedFormatted(): string | null {
    if (!this.lastUpdated) {
      return null;
    }
    return this.lastUpdated.toISOString();
  }
}
