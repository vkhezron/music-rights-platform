import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, Calendar, Lock, Ban, Globe, AlertTriangle, 
         FileText, Shield, User, BarChart2, Music, Copyright, FileCheck,
         Bot, ClipboardList, Link, Users, Scale, Database, Cookie, HardDrive,
         Eye, Clock, Trash2, Edit, StopCircle, Package, X, AlertCircle,
         Mail, Building, Camera, CheckCircle, Info } from 'lucide-angular';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  templateUrl: './privacy-policy.html',
  styleUrl: './privacy-policy.scss'
})
export class PrivacyPolicyComponent {
  // Lucide Icons
  readonly Calendar = Calendar;
  readonly Lock = Lock;
  readonly Ban = Ban;
  readonly Globe = Globe;
  readonly AlertTriangle = AlertTriangle;
  readonly FileText = FileText;
  readonly Shield = Shield;
  readonly User = User;
  readonly BarChart2 = BarChart2;
  readonly Music = Music;
  readonly Copyright = Copyright;
  readonly FileCheck = FileCheck;
  readonly Bot = Bot;
  readonly ClipboardList = ClipboardList;
  readonly Link = Link;
  readonly Users = Users;
  readonly Scale = Scale;
  readonly Database = Database;
  readonly Cookie = Cookie;
  readonly HardDrive = HardDrive;
  readonly Eye = Eye;
  readonly Clock = Clock;
  readonly Trash2 = Trash2;
  readonly Edit = Edit;
  readonly StopCircle = StopCircle;
  readonly Package = Package;
  readonly X = X;
  readonly AlertCircle = AlertCircle;
  readonly Mail = Mail;
  readonly Building = Building;
  readonly Camera = Camera;
  readonly CheckCircle = CheckCircle;
  readonly Info = Info;
}
