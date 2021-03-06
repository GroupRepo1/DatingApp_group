import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Photo } from 'src/app/_models/photo';
import { FileUploader } from 'ng2-file-upload';
import { AuthService } from 'src/app/_services/auth.service';
import { UserService } from 'src/app/_services/user.service';
import { AlertifyService } from 'src/app/_services/alertify.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-photo-editor',
  templateUrl: './photo-editor.component.html',
  styleUrls: ['./photo-editor.component.scss']
})
export class PhotoEditorComponent implements OnInit {
  @Input() photos: Photo[];
  @Output() getMemberPhotoChange = new EventEmitter<string>();

  uploader: FileUploader;
  hasBaseDropZoneOver = false;
  baseUrl = environment.apiUrl;
  currentMain: Photo;

  constructor(private authService: AuthService,
    private userService: UserService,
    private alertify: AlertifyService) { }

  ngOnInit() {
    this.initializeUploader();
  }

  fileOverBase(e: any): void {
    this.hasBaseDropZoneOver = e;
  }

  initializeUploader() {
    this.uploader = new FileUploader({
      url:
        this.baseUrl +      //localhost:4200/api/users/5/photos
        'users/' +
        this.authService.decodedToken.nameid +
        '/photos',

      //[authorize] request passed to header through string 
      authToken: 'Bearer ' + localStorage.getItem('token'),
      isHTML5: true,
      allowedFileType: ['image'],
      removeAfterUpload: true,
      autoUpload: false,
      maxFileSize: 10 * 1024 * 1024
    });

    //This extends the uploader.  file.WithCredentials = not using cookies
    this.uploader.onAfterAddingFile = file => {
      file.withCredentials = false;
    };

    //Uploading photo/s to api>Controler>Photos controller so, if successful -> Do this
    this.uploader.onSuccessItem = (item, response, status, headers) => {
      if (response) {
        const res: Photo = JSON.parse(response); //convert response string -> object
        //These values are returned in response Dto -> Photo.ts
        const photo = {
          id: res.id,
          url: res.url,
          dateAdded: res.dateAdded,
          description: res.description,
          isMain: res.isMain
        };
        this.photos.push(photo); //Push this returned Photo into array var of this class
        if (photo.isMain) {
          this.authService.changeMemberPhoto(photo.url);
          this.authService.currentUser.photoUrl = photo.url;
          localStorage.setItem("user", JSON.stringify(this.authService.currentUser));
        }
      }
    };
  }

  setMainPhoto(photo: Photo) {

    //This takes mbrId, PhotoId and sets this single Photo's isMain(turns off the other).  returns nothing
    this.userService
      .setMainPhoto(this.authService.decodedToken.nameid, photo.id)

      .subscribe(
        () => {
          //"active" = current main.  Since we are changing what is main by passing photo.id to service
          //this is not reflected in our template.  Turn off current main and replace with new passed photo.id
          this.currentMain = this.photos.filter(p => p.isMain === true)[0];
          this.currentMain.isMain = false;
          photo.isMain = true;
          // Takes the single Photo.cs the Client has clicked on and emits the "photoUrl"
          // value as an event that updates this variable
          /* this.getMemberPhotoChange.emit(photo.url) //being replaced by below*/
          this.authService.changeMemberPhoto(photo.url);
          this.authService.currentUser.photoUrl = photo.url;
          localStorage.setItem("user", JSON.stringify(this.authService.currentUser));
          // this.authService.changeMemberPhoto(photo.url);
          // this.authService.currentUser.photoUrl = photo.url;

          // localStorage.setItem(
          //   'user',
          //   JSON.stringify(this.authService.currentUser)
          // );
        },
        error => {
          this.alertify.error(error);
        }
      );
  }

  deletePhoto(id: number) {
    //confirm(display message, IF YES callback() => {} ) else exit method
    this.alertify.confirm('Are you sure you want to delete this photo?', () => {
      this.userService
        .deletePhoto(this.authService.decodedToken.nameid, id)
        .subscribe(
          // If successful response do this
          () => {
            // Find this index and delete 1 object in Photos [] starting from this index
            this.photos.splice(this.photos.findIndex(p => p.id === id), 1);
            this.alertify.success('Photo has been deleted');
          },
          error => {
            this.alertify.error('Failed to delete the photo');
          }
        );
    });
  }

}



