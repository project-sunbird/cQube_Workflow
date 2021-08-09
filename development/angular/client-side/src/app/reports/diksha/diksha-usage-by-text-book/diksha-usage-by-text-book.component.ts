import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DikshaReportService } from '../../../services/diksha-report.service';
import { Router } from '@angular/router';
import { AppServiceComponent } from '../../../app.service';

@Component({
  selector: 'app-diksha-usage-by-text-book',
  templateUrl: './diksha-usage-by-text-book.component.html',
  styleUrls: ['./diksha-usage-by-text-book.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class DikshaUsageByTextBookComponent implements OnInit {
  //chart data variabes:::::::::::::
  chart: boolean = false;
  public colors = [];
  header = '';
  public category: String[] = [];
  public chartData: Number[] = [];
  public xAxisLabel: String = "Total Content Plays";
  public yAxisLabel: String = "District Names"

  public collection_type = 'textbook';

  public result: any = [];
  public timePeriod = 'all';
  public hierName: any;
  public dist: boolean = false;
  public all: boolean = false;
  public timeDetails: any = [{ id: "all", name: "Overall" }, { id: "last_30_days", name: "Last 30 Days" }, { id: "last_7_days", name: "Last 7 Days" }, { id: "last_day", name: "Last Day" }];
  public districtsDetails: any = '';
  public myChart: Chart;
  public showAllChart: boolean = false;
  public allDataNotFound: any;
  public collectioTypes: any = [{ id: "textbook", type: "TextBook" }];
  public collectionNames: any = [];
  collectionName = '';
  footer;

  downloadType;
  fileName: any;
  reportData: any = [];
  y_axisValue;
  state: string;
  public reportName = "usage_by_textbook";

  constructor(
    public http: HttpClient,
    public service: DikshaReportService,
    public commonService: AppServiceComponent,
    public router: Router,
  ) {
  }

  ngOnInit(): void {
    this.state = this.commonService.state;
    document.getElementById('backBtn').style.display = "none";
    document.getElementById('accessProgressCard').style.display = "none";
    this.getAllData();
  }

  emptyChart() {
    this.result = [];
    this.chartData = [];
    this.category = [];
  }

  homeClick() {
    document.getElementById('home').style.display = "none";
    this.timePeriod = 'all';
    this.getAllData()
  }

  getBarChartData() {
    if (this.result.labels.length <= 25) {
      for (let i = 0; i <= 25; i++) {
        this.category.push(this.result.labels[i] ? this.result.labels[i] : ' ')
      }
    } else {
      this.category = this.result.labels;
    }
    this.result.data.forEach(element => {
      this.chartData.push(Number(element[`total_content_plays`]));
    });
  }

  async getAllData() {
    this.emptyChart();
    if (this.timePeriod != "all") {
      document.getElementById('home').style.display = "block";
    } else {
      document.getElementById('home').style.display = "none";
    }
    this.reportData = [];
    this.commonService.errMsg();

    this.collectionName = '';
    this.footer = '';
    this.fileName = `${this.reportName}_${this.timePeriod}_${this.commonService.dateAndTime}`;
    this.result = [];
    this.all = true
    this.dist = false;
    this.header = this.changeingStringCases(this.collection_type) + " Linked";
    this.listCollectionNames();
    this.service.dikshaBarChart({ collection_type: this.collection_type }).subscribe(async result => {
      this.result = result['chartData'];
      this.reportData = result['downloadData'];
      this.footer = result['footer'].toString().replace(/(\d)(?=(\d\d)+\d$)/g, "$1,");
      this.getBarChartData();
      this.time = this.timePeriod == 'all' ? 'overall' : this.timePeriod;
      this.fileToDownload = `diksha_raw_data/table_reports/textbook/${this.time}/${this.time}.csv`;
      this.commonService.loaderAndErr(this.result);
    }, err => {
      this.result = [];
      this.emptyChart();
      this.commonService.loaderAndErr(this.result);
    });

  }

  listCollectionNames() {
    this.commonService.errMsg();
    this.collectionName = '';
    this.footer = '';
    this.reportData = [];
    this.service.listCollectionNames({ collection_type: this.collection_type, timePeriod: this.timePeriod == 'all' ? '' : this.timePeriod }).subscribe(async res => {
      this.collectionNames = [];
      this.collectionNames = res['uniqueCollections'];
      this.collectionNames.sort((a, b) => (a > b) ? 1 : ((b > a) ? -1 : 0));
      if (res['chartData']) {
        document.getElementById('home').style.display = "block";
        this.emptyChart();
        this.result = res['chartData'];
        this.footer = res['footer'].toString().replace(/(\d)(?=(\d\d)+\d$)/g, "$1,");
        this.getBarChartData();
        this.reportData = res['downloadData'];
      }
      this.commonService.loaderAndErr(this.result);
    }, err => {
      this.collectionNames = [];
      this.result = [];
      this.emptyChart();
      this.commonService.loaderAndErr(this.result);
    })
  }

  downloadRawFile() {
    this.service.downloadFile({ fileName: this.fileToDownload }).subscribe(res => {
      window.open(`${res['downloadUrl']}`, "_blank");
    }, err => {
      alert("No Raw Data File Available in Bucket");
    })
  }
  time = this.timePeriod == 'all' ? 'overall' : this.timePeriod;
  fileToDownload = `diksha_raw_data/table_reports/textbook/${this.time}/${this.time}.csv`;
  async chooseTimeRange() {
    this.emptyChart();
    this.time = this.timePeriod == 'all' ? 'overall' : this.timePeriod;
    this.fileToDownload = `diksha_raw_data/table_reports/textbook/${this.time}/${this.time}.csv`;
    document.getElementById('home').style.display = "block";
    if (this.timePeriod == 'all') {
      await this.getAllData();
    } else {
      this.listCollectionNames();
    }
  }

  getDataBasedOnCollections() {
    this.emptyChart();
    this.reportData = [];
    document.getElementById('home').style.display = "block";
    this.commonService.errMsg();
    this.fileName = `${this.reportName}_${this.timePeriod}_${this.commonService.dateAndTime}`;
    this.footer = '';
    this.result = [];
    this.all = true
    this.dist = false
    this.service.getDataByCollectionNames({ collection_type: this.collection_type, timePeriod: this.timePeriod == 'all' ? '' : this.timePeriod, collection_name: this.collectionName }).subscribe(async res => {
      this.result = res['chartData'];
      this.reportData = res['downloadData'];
      this.footer = res['footer'].toString().replace(/(\d)(?=(\d\d)+\d$)/g, "$1,");
      this.getBarChartData();
      this.commonService.loaderAndErr(this.result);
    }, err => {
      this.commonService.loaderAndErr(this.result);
    });
  }

  onChange() {
    document.getElementById('errMsg').style.display = 'none';
  }

  downloadRoport() {
    this.commonService.download(this.fileName, this.reportData);
  }

  changeingStringCases(str) {
    return str.replace(
      /\w\S*/g,
      function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      }
    );
  }
}
