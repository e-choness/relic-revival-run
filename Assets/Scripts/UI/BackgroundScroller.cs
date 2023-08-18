using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace UI
{
    public class BackgroundScroller : MonoBehaviour
    {
        private List<Vector2> waypoints;
        [SerializeField] private float movingSpeed;
        [SerializeField] private int levelIndex;
        private int index;
        private bool isFinished;
        GameManager gM;

        // private enum Level
        // {
        //     Mexico = 1,
        //     China = 2,
        //     Portugal = 3
        // }
        
        // Start is called before the first frame update
        void Start()
        {
            gM = FindObjectOfType<GameManager>();
            isFinished = false;
            // Mexico Level waypoints
            if (levelIndex == 1)
            {
                waypoints = new List<Vector2>
                {
                    new Vector2(9.0f, -19.2f),
                    new Vector2(-21.5f, -19.2f),
                    new Vector2(-24.7f, -8.5f),
                    new Vector2(11.3f, -8.1f),
                    new Vector2(15.2f, 6.2f),
                    new Vector2(-26.0f, 6.2f)
                };
            }
            
            // China level waypoints
            if (levelIndex == 2)
            {
                waypoints = new List<Vector2>
                {
                    new Vector2(5.1f, 3.4f),
                    new Vector2(-216.7f, 3.4f)
                };
            }
            
            // Portugal level waypoints
            if (levelIndex == 3)
            {
                // TODO: add portugal level waypoints
                waypoints = new List<Vector2>
                {
                    new Vector2(22.7f, -10.3f),
                    new Vector2(-21.0f, -10.3f),
                    new Vector2(-21.0f, -7.3f),
                    new Vector2(22.7f, -7.3f),
                    new Vector2(22.7f, -4.3f),
                    new Vector2(-21.0f, -4.3f),
                    new Vector2(-21.0f, -1.3f),
                    new Vector2(22.7f, -1.3f),
                    new Vector2(22.7f,  3.5f),
                    new Vector2(-21.0f, 3.5f),
                    new Vector2(-21.0f, 8.5f),
                    new Vector2(22.7f, 8.5f),
                    new Vector2(22.7f, 14.0f),
                    new Vector2(-21.0f, 14.0f)
                };


            }
            
            index = 0;
            transform.position = waypoints[index];
            index++;
        }

        // Update is called once per frame
        void Update()
        {
            MoveBackground();
            FlipDirection();
        }

        void FlipDirection()
        {
            if(waypoints[index].x > transform.position.x)
            {
                gM.flipSpawnPoint = true;
            }
            else
            {
                gM.flipSpawnPoint = false;
            }
        }

        private void MoveBackground()
        {
            if (index >= waypoints.Count)
            {
                isFinished = true;
                return;
                // GoToNextLevel();
            }
            if (Vector2.Distance(waypoints[index], transform.position) < 0.1f)
            {
                index++; 
            }
            
            if(index < waypoints.Count)
                transform.position = Vector2.MoveTowards(transform.position,
                    waypoints[index],
                    movingSpeed * Time.deltaTime);
        }

        public bool CheckFinished()
        {
            return isFinished;
        }

        private void GoToNextLevel()
        {
            Time.timeScale = 0.0f;
            SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex + 1);
        }
    }
}
